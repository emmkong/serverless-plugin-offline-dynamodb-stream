const path = require('path');
const _ = require('lodash');
const AWS = require('aws-sdk');
const requireWithoutCache = require('require-without-cache');
const DynamoDBSubscriber = require('dynamodb-subscriber');

class ServerlessPluginOfflineDynamodbStream {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.config =
      (serverless.service.custom && serverless.service.custom.dynamodbStream) ||
      {};
    this.options = options;
    const offlineConfig =
      this.serverless.service.custom['serverless-offline'] || {};
    this.location = process.cwd();
    if (offlineConfig.location) {
      this.location = process.cwd() + '/' + offlineConfig.location;
    } else if (this.serverless.config.servicePath) {
      this.location = this.serverless.config.servicePath;
    }
    this.createHandler = this.createHandler.bind(this);
    const streams = this.config.streams || [];
    this.streams = streams.map(({ table, functions = [] }) => ({
      table,
      functions: functions.map((functionName) =>
        _.get(serverless.service.functions, functionName)
      )
    }));
    this.provider = 'aws';
    this.commands = {};
    this.hooks = {
      'before:offline:start:init': this.startReadableStreams.bind(this)
    };
  }

  createHandler(fn) {
    const handler = requireWithoutCache(
      this.location + '/' + fn.handler.split('.')[0],
      require
    )[
      fn.handler
        .split('/')
        .pop()
        .split('.')[1]
    ];
    return (event, context = {}) => handler(event, context);
  }

  startReadableStreams() {
    const self = this;
    const { config: { host: hostname, port, region } = {}, streams } = self;
    const endpoint = new AWS.Endpoint(`http://${hostname}:${port}`);
    streams.forEach(({ table, functions }) => {
      const subscriber = new DynamoDBSubscriber({
        table,
        endpoint,
        interval: '1s'
      });

      subscriber.on('record', (record, keys) => {
        functions.forEach((fn) => {
          if (fn) {
            const handler = this.createHandler(fn);
            handler({ Records: [record] });
          }
        });
      });
      subscriber.start();
    });
  }
}

module.exports = ServerlessPluginOfflineDynamodbStream;
