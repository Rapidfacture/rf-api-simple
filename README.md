# rf-api-simple
Nice little Framework on top of express: start express, add endpint settings, rights management, simplified systax and better error handling.

## Getting started
The `server.js`
```js
const apiSimple = require('rf-api-simple');
apiSimple.createApi({
   pathsWebserver: 'dest',
   port: 4000,
   apiPath: 'server/apis'
}, function (startApiFileFunction) {
   startApiFileFunction(API);
});

restartAPI(); // init

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
The `server.js`
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
// dependencies
const async = require('async');
const objectId = require('mongoose').Types.ObjectId;

exports.start = function (db, API) {
   API.get('addresses', function (req, res) {
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
