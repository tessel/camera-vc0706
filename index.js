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
var Queue = require('sink_q');

var DEBUG = false;
var COMPRESSION_RANGE = 255;

// Helper function which handles error events
// Because this function returns, there is no need to do if (err) else <function>
function handleError (err, callback) {
  if (callback) {
    callback(err);
  }
  this.emit('error', err);
  return;
}

function Camera (hardware, options, callback) {
  // Set the port
  this.hardware = hardware;
  this.queue = new Queue();
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
      if (options) {
        if (options.compression) {
          this.setCompression(options.compression, function(err) {
            if (err) {
              this.emit('error', err);
            }
          }.bind(this));
        }
        if (options.resolution) {
          this.setResolution(options.resolution, function(err) {
            if (err) {
              this.emit('error', err);
            }
          }.bind(this));
        }
      }
      // Report that we are open for business
      setImmediate(function() {
        this.emit('ready');
        this.queue.ready();
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

// Checks if the cameras compression will cause garbled image data based on a blacklist of collected values. 
// If the value is bad, the compression is set to the next highest compression which isn't broken
Camera.prototype._checkCompressionBlacklist = function (resolution, compression) {

  var compressionBlacklist = {
    vga: [0x1b, 0x1c, 0x1d, 0x1f, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25,
      0x26, 0x27, 0x28, 0x29, 0x2a, 0x2b, 0x2c, 0x2d, 0x2e, 0x2f,
      0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 
      0x3a, 0x3b, 0x3c, 0x3d, 0x3e, 0x3f, 0x40, 0x41, 0x42, 0x43, 
      0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x4b, 0x4c, 0x4d, 
      0x4e, 0x4f],
    qvga: [0x10, 0x11, 0x12, 0x13, 0x6, 0x7, 0x8, 0x9, 0xa, 0xb, 0xc,
      0xd, 0xe, 0xf]
  }

  function checkCompression (blacklist, compression, altCompression) {
    if (blacklist.indexOf(compression) > -1) {
      return altCompression;
    } else {
      return compression;
    }
  }

  if (resolution == "qqvga") {
    return compression;
  } else if (resolution == "qvga") {
    return checkCompression(compressionBlacklist.qvga, compression, 0x14);
  } else {
    return checkCompression(compressionBlacklist.vga, compression, 0x80);
  }
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
  this.queue.push(function () {
    this.uart.disable();
  }.bind(this));
};

// Set the compression of the images captured. Automatically resets the camera and returns after completion.
Camera.prototype.setCompression = function(compression, callback) {
  // Some compressions break the camera at certain resolutions. To fix this, we blacklist
  // certain compression - resolution pairs
  this.getResolution(function (err, resolution) {
    if (err) {
      handleError.call(this, err, callback);
    }
    this.queue.push(function (callback) {
      this._sendCommand("compression", {
        "ratio": this._checkCompressionBlacklist(resolution, Math.floor(compression*COMPRESSION_RANGE)<0 ? 0 : Math.floor(compression*COMPRESSION_RANGE)>COMPRESSION_RANGE ? COMPRESSION_RANGE : Math.floor(compression*COMPRESSION_RANGE))
      }, function(err) {
        if (err) {
          handleError.call(this, err, callback);
        } else {
          this._reset(function(err) {

            if (err) {
              handleError.call(this, err, callback);
            }

            if (callback) {
              callback();
            }

            setImmediate(function() {
              this.emit('compression', compression);
            }.bind(this));

            return;
          }.bind(this));
        }
      }.bind(this));
    }.bind(this), callback);
  }.bind(this));
};

// Gets the compression ratio of the images captured. Returns value from [0, 1].
Camera.prototype.getCompression = function(callback) {
  this.queue.push(function (callback) {
    this._sendCommand("getCompression", function(err, compressionRatioRaw) {
      if (err) {
        handleError.call(this, err, callback);
      } else {
        this._reset(function(err) {
          var compressionRatio = (compressionRatioRaw * 1/COMPRESSION_RANGE); // Maps from [0,255] -> [0,1]

          if (err) {
            handleError.call(this, err, callback);
          }

          if (callback) {
            callback(null, compressionRatio);
          }

          setImmediate(function() {
            this.emit('getCompression', compressionRatio);
          }.bind(this));

        }.bind(this));
      }
    }.bind(this));
  }.bind(this), callback);
};

// Set the resolution of the images captured. Automatically resets the camera and returns after completion.
Camera.prototype.setResolution = function(resolution, callback) {
  this.queue.push(function (callback) {
    this._sendCommand("resolution", {"size":resolution}, function(err) {
      if (err) {
        handleError.call(this, err, callback);
      } else {
        this._reset(function(err) {
          if (err) {
            handleError.call(this, err, callback);
          }

          if (callback) {
            callback();
          }

          setImmediate(function() {
            this.emit('resolution', resolution);
          }.bind(this));

        }.bind(this));
      }
    }.bind(this));
  }.bind(this), callback);
};

// Gets the resolution of the images captured.
Camera.prototype.getResolution = function(callback) {
  this.queue.push(function (callback) {
    this._sendCommand("getResolution", function(err, resolutionRaw) {
      if (err) {
        handleError.call(this, err, callback);
      } else {
        this._reset(function(err) {
          var resolution = (resolutionRaw == 0x00) ? 'vga' : (resolutionRaw == 0x11) ? 'qvga' : 'qqvga';

          if (err) {
            handleError.call(this, err, callback);
          }

          if (callback) {
            callback(null, resolution);
          }

          setImmediate(function() {
            this.emit('getResolution', resolution);
          }.bind(this));

        }.bind(this));
      }
    }.bind(this));
  }.bind(this), callback);
};

// Primary method for capturing an image. Actually transfers the image over SPI Slave as opposed to UART.
Camera.prototype.takePicture = function(callback) {
  // Pictures are placed in a queue so that users can call takePicture before ready event
  this.queue.push(function (callback) {
    // Get data about how many bytes to read
    this._getImageMetaData(function foundMetaData(err, imageLength) {
      if (err) {
        handleError.call(this, err, callback);
      } else {
        // Capture the actual data
        this._captureImageData(imageLength, function imageCaptured(err, image) {
          // Wait for the camera to be ready to continue
          if (err) {
            handleError.call(this, err, callback);
          }
          
          this._resolveCapture(image, callback);

        }.bind(this));
      }
    }.bind(this));
  }.bind(this), callback);
};

function use(hardware, options, callback) {
  var camera = new Camera(hardware, options, callback);
  return camera;
}

module.exports.Camera = Camera;
module.exports.use = use;
module.exports.COMPRESSION_RANGE = COMPRESSION_RANGE;
module.exports.resolutions = vclib.resolutions;
