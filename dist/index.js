'use strict';

var slack = require('easy-slack');
var errors = require('errors');
var uuid = require('uuid');

errors.create({
  name: 'ApplicationError',
  body: {},
  type: 'ApplicationError',
  code: 1
});

module.exports.handle = function (error, response, context, callback) {
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
  }).then(function (res) {
    return console.log(res);
  }).catch(function (err) {
    console.error(err);
  }).finally(function () {
    callback(null, {
      statusCode: response.statusCode || 500,
      headers: response.headers,
      body: error.toJSON ? JSON.stringify(error.toJSON()) : JSON.stringify({
        message: error.message,
        code: error.code,
        stack: error.stack,
        uuid: error.uuid
      })
    });
  });
};
'use strict';

var http = require('http');
var errorHandler = require('./error-handler');
var helpers = require('./helpers');

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
        return errorHandler.handle(error, response, context, callback);
      });
    }).catch(function (error) {
      return errorHandler.handle(error, response, context, callback);
    });
  };
};
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
'use strict';

var handler = require('./handler');

module.exports = handler;
