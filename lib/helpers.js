function headersToLowerCase(request) {
  if (request && request.headers) {
    Object.keys(request.headers).forEach((header) => {
      request.headers[header.toLowerCase()] = request.headers[header];
    });
  }
}

module.exports = {
  handleMiddlewares(request, response, options) {
    headersToLowerCase(request);
    if (options && options.middlewares && options.middlewares.length > 0) {
      const promises = options.middlewares.map(middleware => middleware(request, response));
      return Promise.all(promises);
    } else {
      return Promise.resolve();
    }
  },
};
