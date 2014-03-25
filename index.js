var tessel = require('tessel');
var events = require('events');
var util = require('util');
var vclib = require('vclib');

var DEBUG = true;

function use(hardware, next) {
  var camera = new Camera(hardware, next);
  return camera;
}
function Camera (hardware, next){
  this.hardware = hardware;
  this.vclib = new vclib();
  this.uart = hardware.UART({baudrate : 115200});
  hardware.gpio(3).setOutput().high();

  this.getVersion(function(err, version) {

    if (err || !version) {
      setImmediate(function() {
        this.emit('error', new Error("Unable to receive responses from module."));
      }.bind(this));
    }
    else {
      setImmediate(function() {
        this.emit('ready');
      }.bind(this));
    }

    next && next(err, this);
  }.bind(this));
}

util.inherits(Camera, events.EventEmitter);

Camera.prototype.getVersion = function (next){
  this._sendCommand("version", next);
}

Camera.prototype.setResolution = function(resolution, next) {
  this._sendCommand("resolution", {"size":resolution}, next);
}

Camera.prototype.setCompression = function(compression, next) {
  this._sendCommand("compression", {"ratio":compression}, next);
}

Camera.prototype._getFrameBufferLength = function(next) {
  this._sendCommand("bufferLength", next);
}

Camera.prototype._readFrameBuffer = function(length, next) {
  this._sendCommand("readFrameSPI", {"length":length}, next);
}

Camera.prototype.takePicture = function(next) {
  var spi = this.hardware.SPI({role:'slave'});

  this._getFrameBufferLength(function(err, imgSize) {
    if (err) {
      return next && next(err);
    }
    else {

      var rxBuff = new Buffer(imgSize);
      var txBuff = new Buffer(imgSize);

      this._readFrameBuffer(imgSize, function(err) {
        if (err) {
          return next && next(err);
        }
        else {
          spi.transfer(txBuff, rxBuff, function(err, ret){
            if (err) {
              return next && next(err);
            }
            else {
              spi.close();
              setImmediate(function() {
                this.emit('picture', ret);
              }.bind(this));
              next && next(null, ret);
            }
          }.bind(this));
        }
      }.bind(this))
    }
  }.bind(this));
}

Camera.prototype._sendCommand = function(apiCommand, args, callback) {
  if (typeof args === 'function') {
    callback = args;
    args = {};
  }
  if (!args) {
    args = {};
  }

  var self = this;

  // Need to write this function
  self.vclib.getCommandPacket(apiCommand, args, function(err, command) {

    if (err) {
      return callback && callback(err);
    }

    self.uart.on('data', function dataParsing(data) {
      self.vclib.parseIncoming(command, data, function(err, packet) {
        if (err || packet) {
          self.uart.removeListener('data', dataParsing);

          callback && callback(err, packet.response);
        }
      });
    });

    self.uart.write(command.buffer);
  });
}

module.exports.use = use;
module.exports.Camera = Camera;

