var tessel = require('tessel');
var hardware = tessel.port('a');


var imgSize = 10000;
var rxBuff = new Buffer(imgSize);
var txBuff = new Buffer(imgSize);

hardware.gpio(1).output().high();
hardware.gpio(1).low();

var spi = hardware.SPI({role:'slave'});

console.log("Transferring...");
spi.transfer(txBuff, rxBuff, function(err, ret) {
  console.log("Done.");
  if (err) {
    return console.log("Err on transfer");
  }
  else {
    // printBufferLines(ret);
    printEncodedStrings(ret);
    
  }
})

function printEncodedStrings(image) {
  var chunkSize = 10;
  var iter = image.length/chunkSize;
  console.log('preparing to print')
  for (var i = 0; i < iter; i++) {
    var start = i * chunkSize;
    var end = start + chunkSize;
    console.log(ret.slice(start,end));//.toString('base64'));
  }

}
function printBufferLines(ret) {
  var iter = ret.length/10;
  for (var i = 0; i < iter; i++) {
    console.log(i+1, ret.slice(i * 10, (i*10) + 10));
  }
  console.log("\n\n");
}


setInterval(function() {}, 20000);


