var tessel = require('tessel');
var port = tessel.port('a');

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
          
          camera.takePicture(function(err, image) {
            if (err) {
              console.log("error taking image", err);
            }
            else {
              console.log("picture length", image.length);
              // TODO: Add an http outlet here
            }
          });
        }
      });
    });
  }
});

camera.on('error', function(err) {
  console.log("Error connecting", err);
});

setInterval(function() {}, 20000);


