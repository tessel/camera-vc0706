// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

/*********************************************
This camera example sets image resolution and
compression and then takes a picture. If a
directory is specified with the --upload-dir
flag, the picture is saved to that directory.
*********************************************/

var tessel = require('tessel');
var camera = require('../').use(tessel.port['A']); // Replace '../' with 'camera-vc0706' in your own code

var notificationLED = tessel.led[3]; // Set up an LED to notify when we're taking a picture

// Wait for the camera module to say it's ready
camera.on('ready', function() {
  // Set the size of images. Options are 'vga' (640x480), 'qvga'(320x240) or 'qqvga' (160x120). Default is 'vga'. Note that the resolution is saved in Flash and will be persistent between power cycles.
  camera.setResolution('vga', function(err) {
    if (err) {
      return console.log('Error setting resolution', err);
    }
    // Set the compression of images. Should be a number between 0 and 1. Default is .4. Note that the compression is saved in Flash and will be persistent between power cycles.
    camera.setCompression(0.4, function(err) {
      if (err) {
        return console.log('Error setting compression', err);
      } else {
        notificationLED.high();
        camera.takePicture(function(err, image) {
          if (err) {
            console.log('error taking image', err);
          } else {
            notificationLED.low();
            // Name the image
            var name = 'picture-' + Math.floor(Date.now()*1000) + '.jpg';
            console.log('picture size', image.length);
            console.log('uploading as', name);
            // Save the image
            process.sendfile(name, image);
            console.log('done.');
            // Turn the camera off to end the script
            camera.disable();
          }
        });
      }
    });
  });
});

camera.on('error', function(err) {
  console.error(err);
});
