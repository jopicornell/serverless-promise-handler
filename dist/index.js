module.exports =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var handler = __webpack_require__(1);

module.exports = handler;

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var http = __webpack_require__(2);
var errorHandler = __webpack_require__(3);
var helpers = __webpack_require__(6);

module.exports = function (promise, options) {
  return function (event, context, callback) {
    var response = new http.OutgoingMessage();
    Object.assign(response, {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD, PUT, DELETE',
        Allow: 'GET, POST, OPTIONS, HEAD, PUT, DELETE'
      }
    });

    var request = new http.IncomingMessage();
    Object.assign(request, {
      body: null
    });

    context.callbackWaitsForEmptyEventLoop = false;

    if (event && !event.body && (!options || options.requiresBody === undefined || options.requiresBody)) {
      console.error('failure', 'No body at the request');
      request.body = 'No body at the request';
      response.headers['Content-Type'] = 'text/plain';
      return callback(null, {
        body: response.body,
        statusCode: response.statusCode,
        headers: response.headers
      });
    }
    if (event && event.body) {
      try {
        request.body = JSON.parse(event.body);
      } catch (error) {
        console.error('Error parsing JSON ', event.body, error);
        return callback(error);
      }
    }

    if (event) {
      request.pathParameters = event.pathParameters;

      request.headers = event.headers;
    }
    helpers.handleMiddlewares(request, response, options).then(function () {
      return promise(request, response, event, context).then(function (body) {
        if (body && !response.body) {
          response.body = body;
        }
        callback(null, {
          body: JSON.stringify(response.body),
          statusCode: response.statusCode,
          headers: response.headers
        });
      }).catch(function (error) {
        return errorHandler(error, response, context, callback);
      });
    }).catch(function (error) {
      return errorHandler(error, response, context, callback);
    });
  };
};

/***/ }),
/* 2 */
/***/ (function(module, exports) {

module.exports = require("http");

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var slack = __webpack_require__(4);
var uuid = __webpack_require__(5);

module.exports = function (error, response, context, callback) {
  if (!error) {
    // bot.postMessageToChannel('errors', 'unknown error');
    callback(new Error('unknown error'));
  }
  console.error(error);
  if (response.statusCode === 200 && !error.statusCode) {
    response.statusCode = 500;
  }
  if (error.statusCode) {
    response.statusCode = error.statusCode;
  }
  var slackError = void 0;
  error.uuid = uuid();
  if (error.toJSON) {
    slackError = slack.postMessage('errors', {
      text: 'An error has been thrown by the server',
      attachments: [{
        color: 'danger',
        title: error.message,
        fields: Object.keys(error).map(function (key) {
          return key !== 'stack' ? { title: key, value: error[key], short: true } : undefined;
        }),
        footer: error.name
      }]
    });
  } else {
    slackError = slack.postMessage('errors', {
      text: 'An error has been thrown by the server',
      attachments: [{
        title: error.message,
        color: 'danger',
        fields: [{ title: 'Message', value: error.message }, { title: 'Code', value: error.code }, { title: 'UUID', value: error.uuid }, { title: 'Environment', value: process.env.environment }]
      }]
    });
  }

  slackError.then(function () {
    return error.stack && slack.createSnippet('errors', 'Stack error', error.stack);
  }).then(function () {
    return callback(null, {
      statusCode: response.statusCode || 500,
      headers: response.headers,
      body: error.toJSON ? error.toJSON() : JSON.stringify({
        message: error.message,
        code: error.code,
        stack: error.stack,
        uuid: error.uuid
      })
    });
  }).catch(function (err) {
    return callback(null, {
      statusCode: response.statusCode || 500,
      headers: response.headers,
      body: error.toJSON ? error.toJSON() : JSON.stringify({
        message: error.message,
        code: error.code,
        stack: error.stack,
        uuid: error.uuid,
        slackError: err
      })
    });
  });
};

/***/ }),
/* 4 */
/***/ (function(module, exports) {

module.exports = require("easy-slack");

/***/ }),
/* 5 */
/***/ (function(module, exports) {

module.exports = require("uuid");

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


function headersToLowerCase(request) {
  if (request && request.headers) {
    Object.keys(request.headers).forEach(function (header) {
      request.headers[header.toLowerCase()] = request.headers[header];
    });
  }
}

module.exports = {
  handleMiddlewares: function handleMiddlewares(request, response, options) {
    headersToLowerCase(request);
    if (options && options.middlewares && options.middlewares.length > 0) {
      var promises = options.middlewares.map(function (middleware) {
        return middleware(request, response);
      });
      return Promise.all(promises);
    } else {
      return Promise.resolve();
    }
  }
};

/***/ })
/******/ ]);