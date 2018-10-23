function functionA(event) {
  return Promise.resolve(event + 'A');
}
function functionB(event) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(event + 'B');
    }, 500);
  });
}
function functionC(event, context, callback) {
  setTimeout(() => {
    callback(null, event + 'C');
  }, 300);
}

module.exports = {
  functionA,
  functionB,
  functionC
};
