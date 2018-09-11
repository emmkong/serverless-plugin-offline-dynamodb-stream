const { Writable } = require('stream');
const requireWithoutCache = require('require-without-cache');

const createHandler = (location, fn) => {
  const handler = requireWithoutCache(
    location + '/' + fn.handler.split('.')[0],
    require
  )[
    fn.handler
      .split('/')
      .pop()
      .split('.')[1]
  ];
  return (event, context = {}) => handler(event, context);
};

const FunctionExecutable = (location, functions) =>
  new Writable({
    write(chunk, encoding, callback) {
      if (chunk) {
        functions.forEach((fn) => {
          if (fn) {
            const handler = createHandler(location, fn);
            handler(chunk);
          }
        });
      }
      callback();
    },
    objectMode: true
  });

module.exports = FunctionExecutable;
