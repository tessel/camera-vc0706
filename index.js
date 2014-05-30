// Copyright 2014 Technical Machine, Inc. See the COPYRIGHT
// file at the top-level directory of this distribution.
//
// Licensed under the Apache License, Version 2.0 <LICENSE-APACHE or
// http://www.apache.org/licenses/LICENSE-2.0> or the MIT license
// <LICENSE-MIT or http://opensource.org/licenses/MIT>, at your
// option. This file may not be copied, modified, or distributed
// except according to those terms.

var tessel = require('tessel');
var events = require('events');
var util = require('util');
var vclib = require('vclib');
var Queue = require('sync-queue');

var DEBUG = false;
var COMPRESSION_RANGE = 255;

function Camera (hardware, options, callback) {
  // Set the port
  this.hardware = hardware;
  // Reassign the callback if options weren't provided
  if (arguments.length == 2) {
    if (Object.prototype.toString.call(options) == "[object Function]") {
      callback = options;
      options = null;
    }
  }
  // Set a new library for sending/receiving data
  this.vclib = new vclib();
  // Start up UART
  this.uart = hardware.UART({baudrate : 115200});
  // Turn the camera on!
  hardware.digital[2].output().high();

  // Attempt to read the version of firmware
  this._getVersion(function(err, version) {
    // If there was a problem
    if (err || !version) {
      // Report an error
      setImmediate(function() {
        this.emit('error', new Error("Unable to receive responses from module."));
      }.bind(this));
    } else {
      var queue = new Queue();
      if (options) {
        if (options.compression) {
          queue.place(function() {
            this.setCompression(options.compression, function(err) {
              if (err) {
                this.emit('error', err);
              } else {
                queue.next();
              }
            }.bind(this));
          }.bind(this));
        }
        if (options.resolution) {
          queue.place(function() {
            this.setResolution(options.resolution, function(err) {
              if (err) {
                this.emit('error', err);
              } else {
                queue.next();
              }
            }.bind(this));
          }.bind(this));
        }
      }
      // Report that we are open for business
      queue.place(function(){
        setImmediate(function() {
          this.emit('ready');
        }.bind(this));
      }.bind(this));
    }

    // Call the callback
    if (callback) {
      callback(err, this);
    }
    return this;

  }.bind(this));
}

util.inherits(Camera, events.EventEmitter);

Camera.prototype._captureImageData = function(imgSize, callback) {

   // Intialize SPI
  var spi = this.hardware.SPI({role:'slave'});

  // Send the command to read the number of bytes
  this._readFrameBuffer(imgSize, function imageReadCommandSent(err) {
    // If there was a problem, report it
    if (err) {
      return callback(err);
    } else {
      // Begin the transfer
      spi.receive(imgSize, function imageDataRead(err, image){
        if (err) {
          if (callback) {
            callback(err);
          }
          return;
        } else {
          // Close SPI
          spi.close();
          if (callback) {
            callback(null, image);
          }
          return;
        }
      }.bind(this));
    }
  }.bind(this));
};

Camera.prototype._getFrameBufferLength = function(callback) {
  this._sendCommand("bufferLength", callback);
};

Camera.prototype._getImageMetaData = function(callback) {
  // Stop the frame buffer (capture the image...)
  this._stopFrameBuffer(function imageFrameStopped(err) {

    if (err) {
      if (callback) {
        callback(err);
      }
      return;
    } else {
      // Get the size of the image to capture
      this._getFrameBufferLength(function imageLengthRead(err, imgSize) {
        // If there was a problem, report it
        if (err) {
          if (callback) {
            callback(err);
          }
          return;
        } else {
          if (callback) {
            callback(null, imgSize);
          }
          return;
        }
      }.bind(this));
    }
  }.bind(this));
};

// Get the version of firmware on the camera. Typically only used for debugging.
Camera.prototype._getVersion = function (callback){
  this._sendCommand("version", callback);
};

Camera.prototype._readFrameBuffer = function(length, callback) {
  this._sendCommand("readFrameSPI", {"length":length}, callback);
};

Camera.prototype._reset = function(callback) {
  // Tell the module to reset
  this._sendCommand('reset', function(err) {
    // If there was a problem
    if (err) {
      // Report it immediately
      callback(err);
    } else {
      // Wait for the camera to reset
      setTimeout(callback, 300);
    }
  });
};

Camera.prototype._resolveCapture = function(image, callback) {
  // Wait for the camera to tell us it's finished
  this._waitForImageReadACK(function ACKed(err) {
    // Report any errors
    if (err) {
      if (callback) {
        callback(err);
      }
      return;
    } else {
      // Resume frame capturing again
      this._resumeFrameBuffer(function frameResumed(err) {
        // Report any errors
        if (err) {
          if (callback) {
            callback(err);
          }
          return;
        } else {
          // Call the callback
          if (callback) {
            callback(null, image);
          }
          // Emit the picture
          setImmediate(function() {
            this.emit('picture', image);
          }.bind(this));
        }
      }.bind(this));
    }
  }.bind(this));
};

Camera.prototype._resumeFrameBuffer = function(callback) {
  this._sendCommand("frameControl", {command:'resume'}, callback);
};

Camera.prototype._sendCommand = function(apiCommand, args, callback) {
  // If Args weren't passed in, correct the callback
  if (typeof args === 'function') {
    callback = args;
    args = {};
  }
  if (!args) {
    args = {};
  }

  var self = this;
  var timeout;

  // Get the command packet for the request api call
  self.vclib.getCommandPacket(apiCommand, args, function(err, command) {

    if (err) {
      if (callback) {
        callback(err);
      }
      return;
    }

    function UARTDataParser(data) {
      // Try to parse the response (might take several calls)
      self.vclib.parseIncoming(command, data, function(err, packet) {

        // Clear no-data timeout
        clearTimeout(timeout);

        // If it was parsed
        if (err || packet) {
          // Grab the response if available
          var response = packet ? packet.response : null;
          // Remove this listener
          self.uart.removeListener('data', UARTDataParser);
          // Call the callback. Transaction complete
          if (callback) callback(err, response);
          return;
        }
      });
    }

    // Set up a temporary listener... listening for response
    self.uart.on('data', UARTDataParser);

    // Send the command data
    self.uart.write(command.buffer);

    timeout = setTimeout(function noResponse() {
      // Remove the listener
      self.uart.removeListener('data', UARTDataParser);

      // Throw an error
      if (callback) {
        callback(new Error("No UART Response..."));
      }
      return;

    }, 2000);
  });
};

Camera.prototype._stopFrameBuffer = function(callback) {
  this._sendCommand("frameControl", {command:'stop'}, callback);
};

Camera.prototype._waitForImageReadACK = function(callback) {
  var self = this;
  self.vclib.getCommandPacket('readFrameSPI', function foundCommand(err, command) {
    self.uart.on('data', function dataACKParsing(data) {
      self.vclib.parseIncoming(command, data, function vclibDataParsed(err, packet) {
        if (err || packet) {

          self.uart.removeListener('data', dataACKParsing);

          if (callback) {
            callback(err);
          }
          return;
        }
      });
    });
  });
};

// Close camera connection
Camera.prototype.disable = function () {
  this.uart.disable();
};

// Set the compression of the images captured. Automatically resets the camera and returns after completion.
Camera.prototype.setCompression = function(compression, callback) {
  this._sendCommand("compression", {
    "ratio": Math.floor(compression*COMPRESSION_RANGE)<0 ? 0 : Math.floor(compression*COMPRESSION_RANGE)>COMPRESSION_RANGE ? COMPRESSION_RANGE : Math.floor(compression*COMPRESSION_RANGE)
  }, function(err) {
    if (err) {
      if (callback) {
        callback(err);
      }
      return;
    } else {
      this._reset(function(err) {
        if (callback) {
          callback(err);
        }

        setImmediate(function() {
          this.emit('compression', compression);
        }.bind(this));

        return;
      }.bind(this));
    }
  }.bind(this));
};

// Set the resolution of the images captured. Automatically resets the camera and returns after completion.
Camera.prototype.setResolution = function(resolution, callback) {
  this._sendCommand("resolution", {"size":resolution}, function(err) {
    if (err) {
      if (callback) {
        callback(err);
      }
      return;
    } else {
      this._reset(function(err) {
        if (callback) {
          callback(err);
        }

        setImmediate(function() {
          this.emit('resolution', resolution);
        }.bind(this));

      }.bind(this));
    }
  }.bind(this));
};

// Primary method for capturing an image. Actually transfers the image over SPI Slave as opposed to UART.
Camera.prototype.takePicture = function(callback) {
  // Get data about how many bytes to read
  this._getImageMetaData(function foundMetaData(err, imageLength) {
    if (err) {
      if (callback) {
        callback(err);
      }
      return;
    } else {
      // Capture the actual data
      this._captureImageData(imageLength, function imageCaptured(err, image) {
        // Wait for the camera to be ready to continue
        if (err) {
          if (callback) callback(err);
          return;
        } else {
          this._resolveCapture(image, callback);
        }
      }.bind(this));
    }
  }.bind(this));
};

function use(hardware, options, callback) {
  var camera = new Camera(hardware, options, callback);
  return camera;
}

module.exports.Camera = Camera;
module.exports.use = use;
module.exports.COMPRESSION_RANGE = COMPRESSION_RANGE;
