#Camera
Driver for the camera-vc0706 Tessel camera module ([VC0706](http://www.southernstars.com/skycube/files/VC0706.pdf)).

##Installation
```sh
npm install camera-vc0706
```

##Example
```js
/*********************************************
This camera example takes a picture. If a
directory is specified with the --upload-dir
flag, the picture is saved to that directory.
*********************************************/

// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

var tessel = require('tessel');
var camera = require('../').use(tessel.port['A']); // Replace '../' with 'camera-vc0706' in your own code

camera.on('ready', function(err) {
  if (err) return console.log(err);
  else {
    tessel.led[1].high();
    tessel.led[2].high();

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
```

##Methods

##### * `camera.disable()` Disable UART connection to camera. Closes connection & ends process.

##### * `camera.setCompression(compressionFactor, callback(err))` Determine the amount of compression on each image. Should be a number between 0 and 255. Default is 0x35. Note that the compression is saved in Flash and will be persisted between power cycles.

##### * `camera.setResolution(resolution, callback(err))` Set the size of images. Options are vga' (640x320), 'qvga'(320x240) or 'qqvga' (160x120). Default is 'vga'. Note that the resolution is saved in Flash and will be persisted between power cycles.

##### * `camera.takePicture(callback(err, picture))` Take a still picture. Returns raw buffer data which you can pipe into a raw http stream or save in memory.

## Events
```.js
// The camera is ready to receive commands
camera.on('ready', function() {...} );

// The camera was unable to initialize
camera.on('error', function(err) {...} );

// A photo was taken
camera.on('picture', function(picture) {...} );

// A resolution value was set
camera.on('resolution', function(resolution) {...} );

// A compression value was set
camera.on('compression', function(compression) {...} );
```


## License

MIT
