var jpegSize = require('jpeg-size');
var tessel = require('tessel');
var test = require('tinytap');
var async = require('async');
var cameralib = require('../');

var portname = process.argv[2] || 'A';

test.count(32);

var camera;
async.series([
  test('Connecting to camera module', function (t) {
    camera = cameralib.use(tessel.port[portname], {}, function (err, camera) {
      console.log('callback')
      t.ok(camera, 'The camera module object was not returned');
      t.equal(err, undefined, 'There was an error connecting');
      t.end();
    });
  }),

  test('Set Resolution - vga', function (t) {
    camera.setResolution('vga', function () {
      camera.getResolution(function (err, resolution) {
        t.equal(err, undefined, 'There was an error');
        t.equal(resolution, 'vga', "resolution not set correctly");
        t.end();
      });
    });
  }),

  test('Set Resolution - qvga', function (t) {
    camera.setResolution('qvga', function (err) {
      t.equal(err, undefined, 'There was an error');
      camera.getResolution(function (err, resolution) {
        t.equal(err, undefined, 'There was an error');
        t.equal(resolution, 'qvga', "resolution not set correctly");
        t.end();
      });
    });
  }),

  test('Set Resolution - qqvga', function (t) {
    camera.setResolution('qqvga', function (err) {
      t.equal(err, undefined, 'There was an error');
      camera.getResolution(function (err, resolution) {
        t.equal(err, undefined, 'There was an error');
        t.equal(resolution, 'qqvga', "resolution not set correctly");
        t.end();
      });
    });
  }),

  test('Set Invalid Resolution - xxyyxx', function (t) {
    function fn () {
      camera.setResolution('xxyyxx');
    }

    t.throws(fn, /resolution.*invalid/i, "invalid resolution should throw an error");
    t.end();
  }),

  test('Set Compression - 0', function (t) {
    camera.setCompression(0, function (err) {
      t.equal(err, undefined, 'There was an error');
      camera.getCompression(function (err, compression) {
        t.equal(err, undefined, 'There was an error');
        t.equal(compression, 0, "compression not set correctly");
        t.end();
      });
    });
  }),

  test('Set Compression - 1', function (t) {
    camera.setCompression(1, function (err) {
      t.equal(err, undefined, 'There was an error');
      camera.getCompression(function (err, compression) {
        t.equal(err, undefined, 'There was an error');
        t.equal(compression, 1, "compression not set correctly");
        t.end();
      });
    });
  }),

  test('Set Invalid Compression - 3.14', function (t) {
    function fn () {
      camera.setCompression(3.14);
    }

    t.throws(fn, /compression.*invalid/i, "invalid compression should throw an error");
    t.end();
  }),

  test('Take a picture', function (t) {
    camera.setResolution('vga', function (err) {
      t.equal(err, undefined, 'There was an error');
      camera.takePicture(function (err, image) {
        t.equal(err, undefined, 'There was an error');
        var size = jpegSize(image);
        t.equal(size.height, 480, "picture not taken correctly");
        t.equal(size.width, 640, "picture not taken correctly");
        t.end();
      });
    });
  }),

  test('Take multiple pictures', function (t) {
    function validateResponse (err, image) {

      t.equal(err, undefined, "picture not taken correctly");

      var size = jpegSize(image);
      t.equal(size.height, 480, "picture not taken correctly");
      t.equal(size.width, 640, "picture not taken correctly");
    };

    camera.setResolution('vga', function () {
      camera.takePicture(function(err, image) {
        validateResponse(err, image);
        camera.takePicture(function(err, image) {
          validateResponse(err, image);
          t.end();
        });
      });
      camera.takePicture(function(err, image) {
        validateResponse(err, image);
      });
    });
  }),

  test('Close the camera module', function (t) {
    camera.disable(function (err) {
      t.equal(err, undefined, "camera not disabled correctly");
      t.end();
    });
  }),

  ], function(err) {
    console.log('error running tests', err);
  }
);
