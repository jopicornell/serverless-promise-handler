'use strict';

const http = require('http');
const errorHandler = require('./error-handler');
const helpers = require('./helpers');

module.exports = (promise, options) => (event, context, callback) => {
  const response = new http.OutgoingMessage();
  Object.assign(response, {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD, PUT, DELETE',
      Allow: 'GET, POST, OPTIONS, HEAD, PUT, DELETE',
    },
  });

  const request = new http.IncomingMessage();
  Object.assign(request, {
    body: null,
  });

  context.callbackWaitsForEmptyEventLoop = false;

  if (event && !event.body &&
    (!options || options.requiresBody === undefined
    || options.requiresBody)) {
    console.error('failure', 'No body at the request');
    request.body = 'No body at the request';
    response.headers['Content-Type'] = 'text/plain';
    return callback(null, {
      body: response.body,
      statusCode: response.statusCode,
      headers: response.headers,
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
  helpers.handleMiddlewares(request, response, options)
  .then(() => promise(request, response, event, context)
    .then((body) => {
      if (body && !response.body) {
        response.body = body;
      }
      callback(null, {
        body: JSON.stringify(response.body),
        statusCode: response.statusCode,
        headers: response.headers,
      });
    })
    .catch(error => errorHandler(error, response, context, callback)))
    .catch(error => errorHandler(error, response, context, callback));
};
