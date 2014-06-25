#Camera
Driver for the camera-vc0706 Tessel camera module. The hardware documentation for this module can be found [here](https://github.com/tessel/hardware/blob/master/modules-overview.md#camera).

If you run into any issues you can ask for support on the [Camera Module Forums](http://forums.tessel.io/category/camera).

###Installation
```sh
npm install camera-vc0706
```

###Example
```js
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

###Properties
&#x20;<a href="#api-camera-resolutions-An-object-which-maps-resolution-labels-to-their-dimensions-The-string-labels-can-be-used-to-configure-the-camera-s-resolution" name="api-camera-resolutions-An-object-which-maps-resolution-labels-to-their-dimensions-The-string-labels-can-be-used-to-configure-the-camera-s-resolution">#</a> camera<b>.resolutions</b>() An object which maps resolution labels to their dimensions. The string labels can be used to configure the camera's resolution.  


###Methods
&#x20;<a href="#api-camera-disable-Disable-UART-connection-to-camera-Closes-connection-ends-process" name="api-camera-disable-Disable-UART-connection-to-camera-Closes-connection-ends-process">#</a> camera<b>.disable</b>() Disable UART connection to camera. Closes connection & ends process.  

&#x20;<a href="#api-camera-setCompression-compressionFactor-callback-err-Determine-the-amount-of-compression-on-each-image-Should-be-a-number-between-0-and-1-Default-is-0-2-Note-that-the-compression-is-saved-in-Flash-and-will-be-persistent-between-power-cycles" name="api-camera-setCompression-compressionFactor-callback-err-Determine-the-amount-of-compression-on-each-image-Should-be-a-number-between-0-and-1-Default-is-0-2-Note-that-the-compression-is-saved-in-Flash-and-will-be-persistent-between-power-cycles">#</a> camera<b>.setCompression</b>( compressionFactor, callback(err) ) Determine the amount of compression on each image. Should be a number between 0 and 1. Default is 0.2. Note that the compression is saved in Flash and will be persistent between power cycles.  

&#x20;<a href="#api-camera-setResolution-resolution-callback-err-Set-the-size-of-images-Options-are-vga-640x480-qvga-320x240-or-qqvga-160x120-Default-is-vga-Note-that-the-resolution-is-saved-in-Flash-and-will-be-persistent-between-power-cycles" name="api-camera-setResolution-resolution-callback-err-Set-the-size-of-images-Options-are-vga-640x480-qvga-320x240-or-qqvga-160x120-Default-is-vga-Note-that-the-resolution-is-saved-in-Flash-and-will-be-persistent-between-power-cycles">#</a> camera<b>.setResolution</b>( resolution, callback(err) ) <i>Set</i>&nbsp; the size of images\. Options are 'vga' (640x480), 'qvga'(320x240) <i>or</i>&nbsp; 'qqvga' (160x120 ). Default is 'vga'. Note that the resolution is saved in Flash and will be persistent between power cycles.  

&#x20;<a href="#api-camera-takePicture-callback-err-picture-Take-a-still-picture-Returns-raw-buffer-data-which-you-can-pipe-into-a-raw-http-stream-or-save-in-memory" name="api-camera-takePicture-callback-err-picture-Take-a-still-picture-Returns-raw-buffer-data-which-you-can-pipe-into-a-raw-http-stream-or-save-in-memory">#</a> camera<b>.takePicture</b>( callback(err, picture) ) Take a still picture. Returns raw buffer data which you can pipe into a raw http stream or save in memory.  

###Events
&#x20;<a href="#api-camera-on-compression-callback-xyz-Emitted-when-compression-is-set" name="api-camera-on-compression-callback-xyz-Emitted-when-compression-is-set">#</a> camera<b>.on</b>( 'compression', callback(xyz) ) Emitted when compression is set.  

&#x20;<a href="#api-camera-on-error-callback-err-Emitted-upon-error" name="api-camera-on-error-callback-err-Emitted-upon-error">#</a> camera<b>.on</b>( 'error', callback(err) ) Emitted upon error.  

&#x20;<a href="#api-camera-on-picture-callback-picture-Emitted-when-a-photo-is-taken-Returns-buffer-of-image" name="api-camera-on-picture-callback-picture-Emitted-when-a-photo-is-taken-Returns-buffer-of-image">#</a> camera<b>.on</b>( 'picture', callback(picture) ) Emitted when a photo is taken. Returns buffer of image.  

&#x20;<a href="#api-camera-on-ready-callback-Emitted-upon-first-successful-communication-between-the-Tessel-and-the-module" name="api-camera-on-ready-callback-Emitted-upon-first-successful-communication-between-the-Tessel-and-the-module">#</a> camera<b>.on</b>( 'ready', callback() ) Emitted upon first successful communication between the Tessel and the module.  

&#x20;<a href="#api-camera-on-resolution-callback-resolution-Emitted-when-resolution-is-set" name="api-camera-on-resolution-callback-resolution-Emitted-when-resolution-is-set">#</a> camera<b>.on</b>( 'resolution', callback(resolution) ) Emitted when resolution is set.  

###Configuration
In addition to the `camera.setCompression()` and `camera.setResolution()` methods, the camera can be configured at creation with an optional configuration object paremeter in the `.use()` method.
```js
var tessel = require('tessel');
var camera = require('camera-vc0706').use(
  tessel.port['A'], {
      compression: 0.2, 
      resolution: 'vga'
  }
);
```

###Further Examples
* [Camera Options](https://github.com/tessel/camera-vc0706/blob/master/examples/camera-options.js). This camera example sets image resolution and compression and then takes a picture. If a directory is specified with the --upload-dir flag, the picture is saved to that directory.


###License
MIT or Apache 2.0, at your option
