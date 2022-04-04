# rf-api-simple
Nice little Framework on top of express: static webserver, endpoint settings for rights management, simplified systax and improved error handling. We combined the best of several years working with express and mongoose.

## Getting started
Your `server.js`
```js
const apiSimple = require('rf-api-simple');
let API = apiSimple.createApi({
   pathsWebserver: 'dest',
   port: 4000,
   apiPath: 'server/apis'
}, function (startApiFileFunction) {
   startApiFileFunction(API);
});
```

The files under `server/apis/` like `server/apis/address.js`
```js
exports.start = function (API) {
   API.get('addresses', function (req, res) {
      res.send(null, 'Hello World!')
   }, { permission: false });
};

```

## Regular server configuration example
The example shows mutiple mongoose databases, webserver and many endpoint files, external config variables and nice colored logging.

Your `server.js`
```js
// deps
let config = require('rf-config').init(__dirname);
let log = require('rf-log').start(`[${config.app.name}]`);
let db = require('mongoose-multi').start(config.db, config.paths.schemas);

const apiSimple = require('rf-api-simple');
let API = {};
function restartAPI () {
   if (API && API.close) API.close();
   API = apiSimple.createApi(config, function (startApi) {
      startApi(API, db);
   });
}

// init
db.global.mongooseConnection.once('open', restartAPI);

// for external testing: export express server
module.exports = API.server;
```

The files under `server/apis`.
```js
// deps
const async = require('async');
const objectId = require('mongoose').Types.ObjectId;

exports.start = function (db, API) {
   API.get('addresses', function (req, res) {
      console.log(req)
      // this provides much usable data extracted from the token:
      // req: {
      //    data
      //    user,
      //    rights,
      //    originalRequest
      // }
      db.user.addresses
         .find({'accountId': req.data })
         .exec(res.send);
   }, { section: ['account', 'shipping', 'sale'] });
};
```
Stick to the naming convention:
* each endpoint name has to begin with the name of the file
* examples:
   * get addresses
   * get address
   * post adderss
   * post address-delete
   * get addresses-of-accountId


## Development
Use eslint to check the code


## Legal Issues
* Licenese: MIT
* Author: Felix Furtmayr
