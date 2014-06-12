var tessel = require('tessel');
var camera = require('../').use(tessel.port['A']); // Replace '../' with 'camera-vc0706' in your own code

var notificationLED = tessel.led[3]; // Set up an LED to notify when we're taking a picture

// Wait for the camera module to say it's ready

var compression = 0;
function takePics (compression) {
  if (compression > 1) {
    camera.disable();
  } else {
  camera.setCompression(compression, function(){
    console.log('compression', compression)
  })
  camera.takePicture(function(err, image) {
      console.log('take picture')
      if (err) {
        console.log('error taking image', err);
      } else {
        notificationLED.low();
        // Name the image
        var name = 'picture-' + compression + '.jpg';
        // Save the image
        // console.log('Picture saving as', name, '...');
        process.sendfile(name, image);
        console.log('done.');
        // Turn the camera off to end the script
        compression+=.1;
        takePics(compression);
      }
    });
  }
}

camera.on('ready', function () {
  takePics(compression);
})