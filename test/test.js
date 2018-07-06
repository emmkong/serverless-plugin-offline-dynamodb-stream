jest.mock('dynamodb-subscriber');
jest.mock('./handler');
const Subscriber = require('dynamodb-subscriber');
const ServerlessPluginOfflineDynamodbStream = require('../src');

const handler = require('./handler');
const serverless = {
  config: {
    servicePath: '../test'
  },
  service: {
    custom: {
      'serverless-offline': {},
      dynamodbStream: {
        streams: [{ table: 'table-name', functions: ['funtionA'] }]
      },
      functions: { funtionA: { handler: 'handler.funtionA' } }
    }
  }
};
const options = {};

describe('Serverless Plugin Offline Dynamodb Stream', () => {
  test('Meet serverless plugin interface', () => {
    const plugin = new ServerlessPluginOfflineDynamodbStream(
      serverless,
      options
    );
    expect(plugin.hooks).toEqual({
      'before:offline:start:init': expect.any(Function)
    });
  });

  test('should create handler function', () => {
    const plugin = new ServerlessPluginOfflineDynamodbStream(
      serverless,
      options
    );
    const hanler = plugin.createHandler(`${process.cwd()}/test`, {
      handler: 'handler.funtionA'
    });
    expect(hanler).toEqual(expect.any(Function));
  });

  test('should init subscriber', () => {
    const startMockFn = jest.fn();
    const onMockFn = jest.fn();
    Subscriber.mockImplementation(() => ({ on: onMockFn, start: startMockFn }));

    const plugin = new ServerlessPluginOfflineDynamodbStream(
      serverless,
      options
    );
    plugin.hooks['before:offline:start:init']();
    expect(startMockFn).toHaveBeenCalled();
  });
});
