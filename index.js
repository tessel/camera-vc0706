// Copyright 2014 Technical Machine, Inc. See the COPYRIGHT
// file at the top-level directory of this distribution.
//
// Licensed under the Apache License, Version 2.0 <LICENSE-APACHE or
// http://www.apache.org/licenses/LICENSE-2.0> or the MIT license
// <LICENSE-MIT or http://opensource.org/licenses/MIT>, at your
// option. This file may not be copied, modified, or distributed
// except according to those terms.

var events = require('events');
var util = require('util');
var VCLib = require('vclib');
var Queue = require('sink_q');

var COMPRESSION_RANGE = 255;

function Camera(hardware, options, callback) {
  // Set the port
  this.hardware = hardware;
  this.queue = new Queue();
  // Reassign the callback if options weren't provided
  if (arguments.length === 2) {
    if (typeof options === 'function') {
      callback = options;
      options = null;
    }
  }
  // Set a new library for sending/receiving data
  this.vclib = new VCLib();
  // Set the resolutions
  this.resolutions = this.vclib.resolutions;
  // Start up UART
  this.uart = hardware.UART({ baudrate: 115200 });
  // Turn the camera on!
  hardware.digital[2].output().high();

  var cb = this._wrapCallback(callback, 'ready');
  this.on('ready', this.queue.ready.bind(this.queue));

  // Attempt to read the version of firmware
  this._getVersion(function (err, version) {
    if (err) { return cb(err); }
    if (!version) { return cb(new Error('Unable to receive responses from module.')); }

    if (options) {
      if (options.compression) {
        this.setCompression(options.compression);
      }
      if (options.resolution) {
        this.setResolution(options.resolution);
      }
    }

    cb(null, this);
  }.bind(this));
}

util.inherits(Camera, events.EventEmitter);

Camera.prototype._captureImageData = function (imgSize, cb) {

      // Intialize SPI
  var spi = this.hardware.SPI({ role: 'slave' });

  spi.lock(function lockObtained(err, lock) { 
    if (err) { return cb(err); }

    // Send the command to read the number of bytes
    this._readFrameBuffer(imgSize, function imageReadCommandSent(err) {
      if (err) { return cb(err); }


      // Begin the transfer
      lock.rawReceive(imgSize, function imageDataRead(err, image) {
        // Set SPI back to being a master
        this.hardware.SPI({ role: 'master' });

        lock.release(function lockReleased() {
          cb(err, image);
        })
      }.bind(this));
    }.bind(this));
  }.bind(this));
};
Camera.prototype._getFrameBufferLength = function (callback) {
  this._sendCommand('bufferLength', {}, callback);
};

Camera.prototype._getImageMetaData = function (cb) {
  // Stop the frame buffer (capture the image...)
  this._stopFrameBuffer(function imageFrameStopped(err) {
    if (err) { return cb(err); }

    // Get the size of the image to capture
    this._getFrameBufferLength(cb);
  }.bind(this));
};

// Get the version of firmware on the camera. Typically only used for debugging.
Camera.prototype._getVersion = function (callback) {
  this._sendCommand('version', {}, callback);
};

Camera.prototype._readFrameBuffer = function (length, callback) {
  this._sendCommand('readFrameSPI', { length: length }, callback);
};

Camera.prototype._reset = function (cb) {
  this._sendCommand('reset', {}, function (err) {
    if (err) { return cb(err); }

    // Wait for the camera to reset
    setTimeout(cb, 300);
  });
};

Camera.prototype._resolveCapture = function (image, cb) {
  // Wait for the camera to tell us it's finished
  this._waitForImageReadACK(function ACKed(err) {
    if (err) { return cb(err); }

    // Resume frame capturing again
    this._resumeFrameBuffer(function frameResumed(err) {
      if (err) { return cb(err); }

      cb(null, image);
    });
  }.bind(this));
};

Camera.prototype._resumeFrameBuffer = function (callback) {
  this._sendCommand('frameControl', { command: 'resume' }, callback);
};

Camera.prototype._sendCommand = function (apiCommand, args, cb) {

  // Get the command packet for the request api call
  this.vclib.getCommandPacket(apiCommand, args, function (err, command) {
    if (err) { return cb(err); }

    var timeout;

    var UARTDataParser = function (data) {
      // Try to parse the response (might take several calls)
      this.vclib.parseIncoming(command, data, function (err, packet) {

        // Clear no-data timeout
        clearTimeout(timeout);

        // If it was parsed
        if (err || packet) {
          // Grab the response if available
          var response = packet ? packet.response : null;
          // Remove this listener
          this.uart.removeListener('data', UARTDataParser);
          // Call the callback. Transaction complete
          cb(err, response);
        }
      }.bind(this));
    }.bind(this);

    // Set up a temporary listener... listening for response
    this.uart.on('data', UARTDataParser);

    // Send the command data
    this.uart.write(command.buffer);

    timeout = setTimeout(function noResponse() {
      // Remove the listener
      this.uart.removeListener('data', UARTDataParser);

      // Signal an error
      cb(new Error('No UART Response...'));

    }.bind(this), 2000);
  }.bind(this));
};

Camera.prototype._stopFrameBuffer = function (callback) {
  this._sendCommand('frameControl', { command: 'stop' }, callback);
};

Camera.prototype._waitForImageReadACK = function (cb) {
  this.vclib.getCommandPacket('readFrameSPI', function foundCommand(err, command) {
    if (err) { return cb(err); }

    var dataACKParsing = function (data) {
      this.vclib.parseIncoming(command, data, function vclibDataParsed(err, packet) {
        if (err || packet) {

          this.uart.removeListener('data', dataACKParsing);

          cb(err);
        }
      }.bind(this));
    }.bind(this);

    this.uart.on('data', dataACKParsing);
  }.bind(this));
};

Camera.prototype._wrapCallback = function (callback, event) {
  return (function (err, result) {

    if (err && !callback) {
      this.emit('error', err);
    }

    if (callback) {
      callback.apply(this, arguments);
    }

    if (event && !err) {
      this.emit(event, result);
    }

  }.bind(this));
};

// Close camera connection
Camera.prototype.disable = function (callback) {

  var cb = this._wrapCallback(callback, 'disabled');

  this.queue.push(function (cb) {
    this.uart.disable();
    cb(null);
  }.bind(this), cb);
};

// Set the compression of the images captured. Automatically resets the camera and returns after completion.
Camera.prototype.setCompression = function (compression, callback) {

  if (compression < 0 || compression > 1) {
    throw new Error('Compression: ' + compression + ' is invalid. Valid compressions are between 0 and 1');
  }

  var cb = this._wrapCallback(callback, 'compression');
  var args = { ratio: Math.floor(compression * COMPRESSION_RANGE) };

  this.queue.push(function (cb) {
    this._sendCommand('compression', args, function (err) {
      if (err) { return cb(err); }

      this._reset(cb);
    }.bind(this));
  }.bind(this), cb);

};

// Gets the compression ratio of the images captured. Returns value from [0, 1].
Camera.prototype.getCompression = function (callback) {

  var cb = this._wrapCallback(callback, 'getCompression');

  this.queue.push(function (cb) {
    this._sendCommand('getCompression', {}, function (err, compressionRatioRaw) {
      if (err) { return cb(err); }

      this._reset(function (err) {
        if (err) { return cb(err); }

        // Maps from [0,255] -> [0,1]
        var compressionRatio = (compressionRatioRaw / COMPRESSION_RANGE);

        cb(null, compressionRatio);

      }.bind(this));
    }.bind(this));
  }.bind(this), cb);
};

// Set the resolution of the images captured. Automatically resets the camera and returns after completion.
Camera.prototype.setResolution = function (resolution, callback) {

  if (!VCLib.resolutions.hasOwnProperty(resolution)) {
    throw new Error('Resolution: ' + resolution + ' is invalid. Valid resolutions are vga, qvga, qqvga');
  }

  var cb = this._wrapCallback(callback, 'resolution');

  this.queue.push(function (cb) {
    this._sendCommand('resolution', { size: resolution }, function (err) {
      if (err) { return cb(err); }

      this._reset(function (err) {
        if (err) { return cb(err); }

        cb(null, resolution);
      }.bind(this));
    }.bind(this));
  }.bind(this), cb);
};

// Gets the resolution of the images captured.
Camera.prototype.getResolution = function (callback) {

  var cb = this._wrapCallback(callback, 'getResolution');

  this.queue.push(function (cb) {
    this._sendCommand('getResolution', {}, function (err, resolutionRaw) {
      if (err) { return cb(err); }

      this._reset(function (err) {
        if (err) { return cb(err); }

        var resolution = ({
          0x00: 'vga',
          0x11: 'qvga',
          0x22: 'qqvga'
        }[resolutionRaw]);

        cb(null, resolution || 'unknown');
      }.bind(this));
    }.bind(this));
  }.bind(this), cb);
};

// Primary method for capturing an image. Actually transfers the image over SPI Slave as opposed to UART.
Camera.prototype.takePicture = function (callback) {

  var cb = this._wrapCallback(callback, 'picture');

  // Pictures are placed in a queue so that users can call takePicture before ready event
  this.queue.push(function (cb) {
    // Get data about how many bytes to read
    this._getImageMetaData(function foundMetaData(err, imageLength) {
      if (err) { return cb(err); }

      // Capture the actual data
      this._captureImageData(imageLength, function imageCaptured(err, image) {
        if (err) { return cb(err); }

        // Wait for the camera to be ready to continue
        this._resolveCapture(image, cb);

      }.bind(this));
    }.bind(this));
  }.bind(this), cb);
};

function use(hardware, options, callback) {
  return new Camera(hardware, options, callback);
}

module.exports.Camera = Camera;
module.exports.use = use;
module.exports.COMPRESSION_RANGE = COMPRESSION_RANGE;
