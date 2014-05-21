var tessel = require('tessel');
var port = tessel.port['A'];

tessel.led[1].high();
tessel.led[2].high();

var camera = require('camera-vc0706').use(port);

camera.on('ready', function(err) {
  if (err) {
    return console.log(err);
  }
  else {
    camera.setResolution('vga', function(err) {
      if (err) return console.log("Error setting resolution", err);
      camera.setCompression(100, function(err) {
        if (err) return console.log("Error setting compression", err);
        else {
          
          tessel.led[3].high();
          tessel.led[3].high();
          camera.takePicture(function(err, image) {
            if (err) {
              console.log("error taking image", err);
            }
            else {
              var name = 'picture-' + Math.floor(Date.now()*1000) + '.jpg';
              console.log("picture size", image.length);
              console.log('uploading as', name);
              process.sendfile(name, image);
              console.log('done.');
              camera.close();
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
