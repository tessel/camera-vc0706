var tessel = require('tessel');
var port = tessel.port('a');

var camera = require('../index').use(port, function(err) {
  if (err) {
    return console.log(err);
  }
  else {
    // console.log('taking picture');
    camera.takePicture(function(err, image) {
      console.log('taken!', image.length);
      // console.log("picture result", err, image);
      // console.log(image.toString());
      printBufferLines(image);
      // printBufferBase64(image);
    });
  }
});

function printBufferLines(ret) {
  var iter = ret.length/10;
  for (var i = 0; i < iter; i++) {
    console.log(i+1, ret.slice(i * 10, (i*10) + 10));
  }
  console.log("\n\n");
}

function printBufferBase64(image) {
  var chunkSize = 10;
  var chunks = (image.length/chunkSize) - 1;
  var fin = image.length%chunkSize;
  for (var i = 0; i < chunks; i++) {
    var start = i * chunkSize;
    var end = start  + chunkSize;
    console.log(image.slice(start, end).toString('base64'));
  }

  // console.log(image.slice((chunks) * chunkSize, (chunks*chunkSize) + fin).toString('base64'));

}

camera.on('ready', function() {
  // console.log("We're ready!");
});

camera.on('error', function(err) {
  console.log("Error connecting", err);
})

camera.on('picture', function(image) {
  // console.log("Took a picture", image);
});

setInterval(function() {}, 20000);


