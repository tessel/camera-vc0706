var tessel = require('tessel');
var events = require('events');
var hw = process.binding('hw');
var util = require('util');

var RECEIVE = 0x56, // receive cmd
    SEND = 0x76, // send cmd
    SERIAL_ID = 0x00, // default serial number
    GEN_VERSION = 0x11, // Get Firmware version information 
    SET_SERIAL_NUMBER = 0x21, // Set serial number 
    SET_PORT = 0x24, // Set port
    SYSTEM_RESET = 0x26, // reset
    READ_DATA = 0x30, // Read data register
    WRITE_DATA = 0x31, // Write data register
    READ_FBUF = 0x32, // Read buffer register
    WRITE_FBUF = 0x33, // Write buffer register
    GET_FBUF_LEN = 0x34, // Get image lengths in frame buffer
    SET_FBUF_LEN = 0x35, // Set image lengths in frame buffer
    FBUF_CTRL = 0x36, // Control frame buffer register
    COMM_MOTION_CTRL = 0x37, // Motion detect on or off in comunication interface
    COMM_MOTION_STATUS = 0x38, // Get motion monitoring status in comunication interface
    COMM_MOTION_DETECTED = 0x39, // Motion has been detected by comunication interface
    MIRROR_CTRL = 0x3A, // Mirror control
    MIRROR_STATUS = 0x3B, // Mirror status
    COLOR_CTRL = 0x3C, // Control color
    COLOR_STATUS = 0x3D, // Color status
    POWER_SAVE_CTRL = 0x3E, // Power mode control
    POWER_SAVE_STATUS = 0x3F, // Power save mode or not
    AE_CTRL = 0x40, // Control AE
    AE_STATUS = 0x41, // AE status
    MOTION_CTRL = 0x42, // Motion control
    MOTION_STATUS = 0x43, // Get motion status
    TV_OUT_CTRL = 0x44, // TV output on or off control
    OSD_ADD_CHAR = 0x45, // Add characters to OSD channels
    DOWNSIZE_CTRL = 0x54, // Downsize Control
    DOWNSIZE_STATUS = 0x55, // Downsize status
    GET_FLASH_SIZE = 0x60, // Get SPI flash size
    ERASE_FLASH_SECTOR = 0x61, // Erase one block of the flash
    ERASE_FLASH_ALL = 0x62, // Erase the whole flash
    READ_LOGO = 0x70, // Read and show logo
    SET_BITMAP = 0x71, // Bitmap operation
    BATCH_WRITE = 0x80 // Write mass data at a time
    ;

function Camera (hardware){
  this.hardware = hardware;
  this.uart = hardware.UART({baudrate : 115200});
  // this.spi = this.hardware.SPI();
  this.uart.on('data', this.parseData.bind(this));
  hardware.gpio(3).setOutput().high();
  // this.spi = this.hardware.SPI({clockSpeed: 13500000, cpol: 0, cpha:1});;
}

util.inherits(Camera, events.EventEmitter);

Camera.prototype.parseData = function (data){
  console.log("got data", data);
}

Camera.prototype.readCommandType = function(){
  // var txBuff = new Buffer([RECEIVE, SERIAL_ID, READ_DATA, 0x04, 0x05, 0x01, 0x00, 0x07]);
  var txBuff = new Buffer([RECEIVE, SERIAL_ID, READ_DATA, 0x04, 0x05, 0x03, 0x80, 0x00]);
  this.uart.write(txBuff);
}

Camera.prototype.version = function (next){
  console.log("getting version");

  // var rxBuff = new Buffer(16);
  // var txBuff = new Buffer([RECEIVE, SERIAL_ID, GEN_VERSION, 0x00,
  //   0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  // this.hardware.gpio(3).low();
  // var ret = this.spi.transferSync(txBuff, rxBuff);
  // this.hardware.gpio(3).high();
  // console.log("version", ret);
  this.uart.write(new Buffer([RECEIVE, SERIAL_ID, GEN_VERSION, 0x00]));
  this.uart.once('data', next);
}

Camera.prototype.getFrameBufferLength = function(){
  // find the current frame buffer length
  var buffLenCmd = new Buffer([RECEIVE, SERIAL_ID, GET_FBUF_LEN, 0x01, 0x00]);
  this.uart.write(buffLenCmd);
}

var hw = process.binding('hw');

Camera.prototype.takePicture = function() {
  var imgSize = 0x64; 
  // switch into spi slave mode
  var spi = this.hardware.SPI({role:'slave'});
  // spi._initialize();
  // console.log("initializing buffer", hw.SPI_SLAVE_MODE);
  // var imgArr = new Array(imgSize);
  
  var rxBuff = new Buffer(imgSize);
  // var imgArr = [];
  // for(var i = 0; i<imgSize; i++){
  //   imgArr.push(0);
  // }
  var txBuff = new Buffer(imgSize);
  console.log("initialized buffer", rxBuff, rxBuff.length);
  
  var cmdBuf = new Buffer([RECEIVE, SERIAL_ID, READ_FBUF, 0x0C, 0x00, 0x0F, 
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x64, 0xFF, 0xFF]);
  this.uart.write(cmdBuf);
  // pull cs low
  // this.hardware.gpio(3).low();
  spi.transfer(txBuff, rxBuff, function(err, ret){
    // this.hardware.gpio(3).high();
    console.log("got this from the camera", ret);
    spi.close();

  });
  // var ret = spi.transferSync(txBuff, rxBuff);

  // var ret = spi.transferSync(txBuff, rxBuff);
  // var rxbuf = spi.transferSync(txbuf, unused_rxbuf);

  // disable spi
  console.log("spi closed", ret);
  return ret;
}

function connect (hardware, next) {
  return new Camera(hardware);
}

console.log("setting up")
var camera = connect(tessel.port('A'));
// camera.readCommandType();
// camera.version();
// camera.version(function(err, version){
  // console.log('version', version);
// });
console.log("taking pic");
// camera.getFrameBufferLength();
camera.takePicture();
// camera.takePicture(function(err, buff){
//   // buff is the image buffer
// });

