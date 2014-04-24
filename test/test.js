var tessel = require('tessel');
var port = tessel.port('a');
var async = require('async');
var http;

// Only 
function sendFile(buf) {
  process.binding('hw').usb_send(0xFFFF, buf);
}

var camera = require('../index').use(port, function(err) {
  if (err) {
    return console.log(err);
  }
  else {
    camera.setResolution('vga', function(err) {
      if (err) return console.log("Error setting resolution", err);
      camera.setCompression(100, function(err) {
        if (err) return console.log("Error setting compression", err);
        else {
          async.whilst(
            function () { return true; },
            function (callback) {
              camera.takePicture(function(err, image) {
                if (err) {
                  console.log("error taking image", err);
                }
                else {
                  console.log("picture length", image.length);
                  sendFile(image);
                }
                callback();

              });
            },
            function (err) {
                console.log('damn, there was an error');
            }
          );
        }
      });
    });
  }
});

camera.on('ready', function() {
  console.log("We're ready!");
});

camera.on('error', function(err) {
  console.log("Error connecting", err);
});

camera.on('picture', function(image) {
  console.log("Took a picture", image);
});

camera.on('resolution', function(resolution) {
  console.log("Resolution was set!", resolution);
});

camera.on('compression', function(compression) {
  console.log("Compression was set!", compression);
});

setInterval(function() {}, 20000);


