const executeFunctions = require('../src/executeFunctions');

test('should able to handle async function', () => {
  return executeFunctions('result', `${process.cwd()}/test`, [
    {
      handler: 'handler.functionA'
    }
  ]).then(([result]) => {
    expect(result).toBe('resultA');
  });
});

test('should able to handle return promise', () => {
  return executeFunctions('result', `${process.cwd()}/test`, [
    {
      handler: 'handler.functionB'
    }
  ]).then(([result]) => {
    expect(result).toBe('resultB');
  });
});

test('should able to handle via callback', () => {
  return executeFunctions('result', `${process.cwd()}/test`, [
    {
      handler: 'handler.functionC'
    }
  ]).then(([result]) => {
    expect(result).toBe('resultC');
  });
});

test('should able to handle multiple functions', () => {
  return executeFunctions('result', `${process.cwd()}/test`, [
    {
      handler: 'handler.functionA'
    },
    {
      handler: 'handler.functionB'
    },
    {
      handler: 'handler.functionC'
    }
  ]).then(([result1, result2, result3, result4]) => {
    expect(result1).toBe('resultA');
    expect(result2).toBe('resultB');
    expect(result3).toBe('resultC');
  });
});
