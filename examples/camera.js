// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

/*********************************************
This camera example takes a picture. If a
directory is specified with the --upload-dir
flag, the picture is saved to that directory.
*********************************************/

var tessel = require('tessel');
var camera = require('../').use(tessel.port['A']); // Replace '../' with 'camera-vc0706' in your own code

camera.on('ready', function(err) {
  if (err) {
    return console.log(err);
  } else {
    tessel.led[1].high();
    tessel.led[2].high();

    camera.setResolution('vga', function(err) {
      if (err) return console.log('Error setting resolution', err);
      camera.setCompression(100, function(err) {
        if (err) {
          return console.log('Error setting compression', err);
        } else {
          tessel.led[3].high();
          camera.takePicture(function(err, image) {
            if (err) {
              console.log('error taking image', err);
            } else {
              var name = 'picture-' + Math.floor(Date.now()*1000) + '.jpg';
              console.log('picture size', image.length);
              console.log('uploading as', name);
              process.sendfile(name, image);
              console.log('done.');
              camera.disable();
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
