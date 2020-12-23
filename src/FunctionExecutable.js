const { Writable } = require('stream');
const executeFunctions = require('./executeFunctions');

const FunctionExecutable = (location, functions) =>
  new Writable({
    write(chunk = [], encoding, callback) {
      executeFunctions(chunk, location, functions).then(() => {
        callback();
      });
    },
    objectMode: true,
  });

module.exports = FunctionExecutable;
