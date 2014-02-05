#Camera
Driver for the camera-vc0706 Tessel camera module ([VC0706](http://www.southernstars.com/skycube/files/VC0706.pdf)).

##Installation
```sh
npm install camera-vc0706
```

##Example
```js
var camera = require('camera-vc0706').connect(tessel.port('A'));
```

##Methods

*  **`camera`.parseData(data)**

*  **`camera`.version()**

*  **`camera`.takePicture()**

## License

MIT
