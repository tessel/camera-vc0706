#Camera
Driver for the camera-vc0706 Tessel camera module ([VC0706](http://www.southernstars.com/skycube/files/VC0706.pdf)).

##Installation
```sh
npm install camera-vc0706
```

##Methods
```.js

// Take a still picture. Returns raw buffer data which you can pipe into a raw http stream or save in memory
camera.takePicture( function(err, picture) {...} );

// Set the size of images.
// Options are vga' (640x320), 'qvga'(320x240) or 'qqvga' (160x120). Default is 'vga'.
// Note that the resolution is saved in Flash and will be persisted between power cycles
camera.setResolution( resolution, function(err) {...} );

// Determine the amount of compression on each image. 
// Should be a number between 0 and 255. Default is 0x35. 
// Note that the compression is saved in Flash and will be persisted between power cycles
camera.setCompression(compressionFactor, function(err) {...} );
```

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
