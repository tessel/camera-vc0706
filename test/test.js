var jpegSize = require('jpeg-size');
var tessel = require('tessel');

var portname = process.argv[2] || 'A';
console.log('# listening on port', portname)

var camera = require('../').use(tessel.port[portname]);

console.log('1..7');

camera.on('ready', function(err) {
  if (err) return console.log('not ok - error on ready:', err);
  console.log('ok - camera ready');

  camera.setResolution('vga', function(err) {
    if (err) return console.log('not ok - error setting resolution:', err);
    console.log('ok - resolution set');

    camera.setCompression(100, function(err) {
      if (err) return console.log('not ok - error setting compression:', err);
      console.log('ok - compression set');

      camera.takePicture(function(err, image) {
        if (err) return console.log('not ok - error taking image:', err);
        console.log('ok - successfuly took image');

        console.log(image.length > 0 ? 'ok' : 'not ok', '- picture length');

        var size = jpegSize(image);
        console.log(size.height == 480 ? 'ok' : 'not ok', '- jpeg height');
        console.log(size.width == 640 ? 'ok' : 'not ok', '- jpeg width');

        console.log('# done.');
        camera.disable();
      });
    });
  });
});

camera.on('error', function (err) {
  console.log('not ok', '-', err);
});
