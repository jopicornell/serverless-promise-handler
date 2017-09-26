const slack = require('easy-slack');
const uuid = require('uuid');

module.exports = (error, response, context, callback) => {
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
  let slackError;
  error.uuid = uuid();
  if (error.toJSON) {
    slackError = slack.postMessage('errors', {
      text: 'An error has been thrown by the server',
      attachments: [{
        color: 'danger',
        title: error.message,
        fields: Object.keys(error).map(key => (key !== 'stack' ? ({ title: key, value: error[key], short: true }) : undefined)),
        footer: error.name,
      }],
    });
  } else {
    slackError = slack.postMessage('errors', {
      text: 'An error has been thrown by the server',
      attachments: [{
        title: error.message,
        color: 'danger',
        fields: [
          { title: 'Message', value: error.message },
          { title: 'Code', value: error.code },
          { title: 'UUID', value: error.uuid },
          { title: 'Environment', value: process.env.environment },
        ],
      }],
    });
  }

  slackError.then(() => error.stack && slack.createSnippet('errors', 'Stack error', error.stack))
  .then(() => callback(null, {
    statusCode: response.statusCode || 500,
    headers: response.headers,
    body: error.toJSON ? error.toJSON() : JSON.stringify({
      message: error.message,
      code: error.code,
      stack: error.stack,
      uuid: error.uuid,
    }),
  }))
  .catch(err => callback(null, {
    statusCode: response.statusCode || 500,
    headers: response.headers,
    body: error.toJSON ? error.toJSON() : JSON.stringify({
      message: error.message,
      code: error.code,
      stack: error.stack,
      uuid: error.uuid,
      slackError: err,
    }),
  }));
};
