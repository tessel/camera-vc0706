var jpegSize = require('jpeg-size');
var tessel = require('tessel');
var portname = process.argv[2] || 'A';
var test = require('ttt');
var async = require('async');

async.series([
  test('Connecting to camera module', function (t) {
    camera = require('../').use(tessel.port[portname], {}, function (err, camera) {
      console.log('callback')
      t.ok(camera, 'The camera module object was not returned');
      t.equal(err, undefined, 'There was an error connecting');
      t.end();
    });
  }),

  test('Set Resolution - vga', function (t) {
    camera.setResolution('vga', function () {
      camera.getResolution(function (err, resolution) {
        t.equal(resolution, 'vga', "resolution not set correctly");
        t.end();
      });
    });
  }),

  test('Set Resolution - qvga', function (t) {
    camera.setResolution('qvga', function () {
      camera.getResolution(function (err, resolution) {
        t.equal(resolution, 'qvga', "resolution not set correctly");
        t.end();
      });
    });
  }),

  test('Set Resolution - qqvga', function (t) {
    camera.setResolution('qqvga', function () {
      camera.getResolution(function (err, resolution) {
        t.equal(resolution, 'qqvga', "resolution not set correctly");
        t.end();
      });
    });
  }),

  test('Set Invalid Resolution - xxyyxx', function (t) {
    camera.setResolution('xxyyxx', function (err) {
      t.equal(err.message, "Resolution: xxyyxx is invalid. Valid resolutions are vga, qvga, qqvga", "invalid resolution should throw an error");
      t.end();
    });
  }),

  test('Set Compression - 0', function (t) {
    camera.setCompression(0, function () {
      camera.getCompression(function (err, compression) {
        t.equal(compression, 0, "compression not set correctly");
        t.end();
      });
    });
  }), 

  test('Set Compression - 1', function (t) {
    camera.setCompression(1, function () {
      camera.getCompression(function (err, compression) {
        t.equal(compression, 1, "compression not set correctly");
        t.end();
      });
    });
  }),   
  
  test('Set Invalid Compression - 3.14', function (t) {
    camera.setCompression(3.14, function (err) {
      t.equal(err.message, "Compression: 3.14 is invalid. Valid compressions are between 0 and 1", "invalid resolution should throw an error");
      t.end();
    });
  }), 

  test('Take a picture', function (t) {
    camera.setResolution('vga', function () {
      camera.takePicture(function (err, image) {
        var size = jpegSize(image);
        t.equal(size.height, 480, "picture not taken correctly");
        t.equal(size.width, 640, "picture not taken correctly");
        t.end();
        camera.disable();
      })
    })
  }),

  test('Take multiple pictures', function (t) {
    function validatePicture (image, size) {
      t.equal(size.height, 480, "picture not taken correctly");
      t.equal(size.width, 640, "picture not taken correctly");
    };

    camera.setResolution('vga', function () {
      camera.takePicture(function(err, image) {
        camera.takePicture(function(err, image) {
          validatePicture(image, jpegSize(image));
          t.end();
        });
        validatePicture(image, jpegSize(image));
      });
      camera.takePicture(function(err, image) {
        validatePicture(image, jpegSize(image));
      });
    })
  }),


  ], function(err) {
    console.log('error running tests', err);
  }
);