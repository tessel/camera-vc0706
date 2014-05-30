#Camera
Driver for the camera-vc0706 Tessel camera module ([VC0706](http://www.southernstars.com/skycube/files/VC0706.pdf)).

##Installation
```sh
npm install camera-vc0706
```

##Example
```js
// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

/*********************************************
This camera example takes a picture. If a
directory is specified with the --upload-dir
flag, the picture is saved to that directory.
*********************************************/

var tessel = require('tessel');
var camera = require('camera-vc0706').use(tessel.port['A']);

var notificationLED = tessel.led[3]; // Set up an LED to notify when we're taking a picture

// Wait for the camera module to say it's ready
camera.on('ready', function() {
  notificationLED.high();
  // Take the picture
  camera.takePicture(function(err, image) {
    if (err) {
      console.log('error taking image', err);
    } else {
      notificationLED.low();
      // Name the image
      var name = 'picture-' + Math.floor(Date.now()*1000) + '.jpg';
      // Save the image
      console.log('Picture saving as', name, '...');
      process.sendfile(name, image);
      console.log('done.');
      // Turn the camera off to end the script
      camera.disable();
    }
  });
});

camera.on('error', function(err) {
  console.error(err);
});
```

##Methods

##### * `camera.disable()` Disable UART connection to camera. Closes connection & ends process.

##### * `camera.setCompression(compressionFactor, callback(err))` Determine the amount of compression on each image. Should be a number between 0 and 255. Default is 0x35. Note that the compression is saved in Flash and will be persistent between power cycles.

##### * `camera.setResolution(resolution, callback(err))` Set the size of images. Options are 'vga' (640x320), 'qvga'(320x240) or 'qqvga' (160x120). Default is 'vga'. Note that the resolution is saved in Flash and will be persistent between power cycles.

##### * `camera.takePicture(callback(err, picture))` Take a still picture. Returns raw buffer data which you can pipe into a raw http stream or save in memory.


##Events

##### * `camera.on('compression', callback(xyz))` Emitted when compression is set.

##### * `camera.on('error', callback(err))` Emitted upon error.

##### * `camera.on('picture', callback(picture))` Emitted when a photo is taken. Returns buffer of image.

##### * `camera.on('ready', callback())` Emitted upon first successful communication between the Tessel and the module.

##### * `camera.on('resolution', callback(resolution))` Emitted when resolution is set.

##Configuration
In addition to the `camera.setCompression()` and `camera.setResolution()` methods, the camera can be configured at creation with an optional configuration object paremeter in the `.use()` method.
```js
var tessel = require('tessel');
var camera = require('camera-vc0706').use(
  tessel.port['A'], {
      compression: 255, 
      resolution: 'vga'
  }
);
```

##Further Examples
See the examples folder for code.

* camera-options: Set the image resolution and compression after setup and then take a picture.


##License

MIT
APACHE
