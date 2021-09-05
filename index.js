// helper middleware for express requests with logging and error handling

const fs = require('fs');
const log = require('rf-log');
const jwt = require('jsonwebtoken');
const rfHttp = require('rf-http');

module.exports = {
   createApi
};

function createApi (config, apiCallbackFunction) {
   config = config || {};

   // import webserver path from rf-config
   if (config.paths) {
      if (config.paths.webserver) config.pathsWebserver = config.paths.webserver;
      if (config.paths.apis) config.pathsApis = config.paths.webserver;
   }

   const defaultConfig = {
      port: 4000,
      pathsWebserver: 'dest',
      // pathsApis: 'server/apis', // no default
      bodyParserLimitSize: '110mb',
      devMode: false,
      sessionSecret: null,
      expiresIn: false
   };
   Object.assign(config, defaultConfig);

   // init
   let http = rfHttp.start(config);
   let expressApp = http.app;
   if (config.pathsApis && apiCallbackFunction) {
      log.success(`starting apis under ${config.pathsApis}`);
      startApiFiles(config.pathsApis, apiCallbackFunction);
   } else if (apiCallbackFunction && !config.pathsApis) {
      log.error(`apiCallbackFunction defined but no config.pathsApis`);
   } else if (!apiCallbackFunction && config.pathsApis) {
      log.error(`config.pathsApis defined but no apiCallbackFunction`);
   }

   return {
      log: log,
      prefix: '/api/',
      config: config,
      app: expressApp,
      server: http.server, // return of "app.listen"
      close, // stop webserver
      startApi, // start everything
      generateToken,
      checkToken,
      //  HTTP helper functions to shorten the code
      get,
      post
   };

   function close () {
      if (http && http.server) {
         http.server.close();
         http = {};
      }
   }

   function startApi (callback) {
      startApiFiles(config.pathsApis, callback);
   }

   function generateToken (user, sessionSecret) {
      user = JSON.parse(JSON.stringify(user));
      if (user.firstname) user.firstname = b64EncodeUnicode(user.firstname);
      if (user.lastname) user.lastname = b64EncodeUnicode(user.lastname);
      if (sessionSecret) config.sessionSecret = sessionSecret;
      let expiresIn = config.expiresIn || 60 * 60 * 168; // 1 week as default
      return jwt.sign(user, config.sessionSecret, expiresIn);
   }

   function checkToken (settings, req) {
      var decoded = {};
      var token = req.body.token || req.query.token || req.headers['x-access-token'];
      var err = new Error();

      if (token) {
         try {
            decoded = jwt.verify(token, config.sessionSecret, { ignoreExpiration: true });
         } catch (e) {
            err.code = 498;
            err.message = 'Bad Request - Invalid Token';
         }
      }

      return new Promise(function (resolve, reject) {
         if (settings.permission === false) {
            if (decoded) {
               resolve(decoded);
            } else {
               resolve();
            }
         } else if (decoded && decoded.rights && decoded.rights.indexOf(settings.section) !== -1) {
            resolve(decoded);
         } else {
            err.code = 401;
            reject(err);
         }
      });
   }

   function get (endpointName, func, settings) {
      if (!settings) return log.critical(`endpoint ${endpointName} has no settings defined!`);
      if (settings.realGet) {
         apiSend(expressApp, endpointName, func, settings, 'realGet', this);
      } else {
         apiSend(expressApp, endpointName, func, settings, 'get', this);
      }
   }

   function post (endpointName, func, settings) {
      if (!settings) return log.critical(`endpoint ${endpointName} has no settings defined!`);
      apiSend(expressApp, endpointName, func, settings, 'post', this);
   }
}

function apiSend (app, functionName, func, settings, method, self) {
   var options = getOptions(method);
   var endPoint = self.prefix + options.methodPrefix + functionName;
   app[options.httpMethod](endPoint, function (req, res) {
      // Log request
      if (!settings.logDisabled) log.info(options.log + ': ' + functionName);
      res = new Response(res);
      req.body = req.body || {};
      req.body.data = req.body.data || {};
      let request = {
         data: req.body.data,
         originalRequest: req
      };

      self.checkToken(settings, req).then(function (decoded) {
         request.user = decoded || {};
         request.rights = decoded.rights || [];
         delete request.user.rights;
         func(request, res);
      }).catch(function (e) {
         if (e.code === 401) {
            res.errorAuthorizationRequired(`${functionName} token invalid! ${e.message}`);
         } else {
            log.error(e);
            res.errorAccessDenied(`${functionName} not allowed! ${e.message}`);
         }
      });
   });
}

function getOptions (method) {
   return {
      get: {
         methodPrefix: 'get-',
         log: 'GET',
         httpMethod: 'post'
      },
      realGet: {
         methodPrefix: '',
         log: 'GET',
         httpMethod: 'get'
      },
      post: {
         methodPrefix: 'post-',
         log: 'POST',
         httpMethod: 'post'
      }
   }[method];
}

function Response (res) {
   var self = this;
   self.send = function (err, docs, callback) {
      if (!err && callback && typeof (callback) === 'function') {
         callback(docs);
      } else {
         send(err, docs, res);
      }
   };
   self.error = function (err) {
      err = handleError(err);
      send('Server Error: ' + err, null, res, 500);
      log.error('Server Error: ' + err);
   };
   self.errorBadRequest = function (err) {
      send('Bad request: ' + err, null, res, 400);
   };
   self.errorAuthorizationRequired = function (msg) {
      send(`Authorization required! ${msg || ''}`, null, res, 401);
   };
   self.errorAccessDenied = function (err) {
      send('Access denied: ' + err, null, res, 403);
   };

   function send (err, docs, res, status) { // handle requests
      if (err) {
         status = status || 500;
         err = handleError(err);
         res
            .status(status)
            .send(err)
            .end();
      } else { // success; last step
         status = status || 200;
         res
            .status(status)
            .json(docs)
            .end();
      }
   }

   function handleError (err) {
   // return the required error string for the response
      if (typeof err === 'object') {
         // MongoDB Unique Error
         if (err.code === 11000) return err.errmsg;
         // else
         return JSON.stringify(err);
      }
      return err;
   }
}

function startApiFiles (apiPath, callback) {
   try {
      var paths = getDirectoryPaths(apiPath);
      paths.forEach(function (path) {
         var apiStartFunction = require(path).start;
         callback(apiStartFunction);
      });
   } catch (err) {
      log.critical(err);
   }

   function getDirectoryPaths (path) {
      var pathList = [];
      fs.readdirSync(path).forEach(function (file) {
         var filePath = path + '/' + file;
         var stat = fs.statSync(filePath);
         if (stat && stat.isDirectory()) {
            pathList = pathList.concat(getDirectoryPaths(filePath));
         } else if (file[0] !== '.') {
            pathList.push(path + '/' + file.split('.')[0]);
         }
      });
      return pathList;
   }
}

function b64EncodeUnicode (str) {
   // first we use encodeURIComponent to get percent-encoded UTF-8,
   // then we convert the percent encodings into raw bytes which
   // can be fed into btoa.
   return btoaNode(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      function toSolidBytes (match, p1) {
         return String.fromCharCode('0x' + p1);
      }));
}

function btoaNode (str) {
   var buffer;
   if (str instanceof Buffer) {
      buffer = str;
   } else {
      buffer = Buffer.from(str.toString(), 'binary');
   }
   return buffer.toString('base64');
}
