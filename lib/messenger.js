var vclib = require('vclib');

function Messenger(hardware) {
  this.hardware = hardware;
  
  // // this.spi = this.hardware.SPI();
  // this.uart.on('data', this.parseData.bind(this));
}

Messenger.prototype.getVersion = function(callback) {
  this.sendCommand("version", callback);
}

Messenger.prototype.captureImage = function(callback) {
  this.sendCommand(vclib.api.takePicture, callback);
}

Messenger.prototype.sendCommand = function(apiCommand, args, callback) {
  if (typeof args === 'function') {
    callback = args;
    args = {};
  }
  if (!args) {
    args = {};
  }

  var self = this;
  console.log("Sending in", apiCommand, args, callback);
  // Need to write this function
  self.vclib.getCommandPacket(apiCommand, args, function(err, command) {

    if (err) {
      return callback && callback(err);
    }

    console.log('command', command, command.buffer)

    self.uart.on('data', function dataParsing(data) {
      console.log('data');
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

module.exports = Messenger; 