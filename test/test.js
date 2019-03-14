jest.mock('../src/DynamoDBStreamReadable');
jest.mock('./handler');
const ServerlessPluginOfflineDynamodbStream = require('../src');

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

  test('should has correct hook', () => {
    const plugin = new ServerlessPluginOfflineDynamodbStream(
      serverless,
      options
    );
    expect(plugin.hooks['before:offline:start:init']).toBeTruthy();
  });
});
