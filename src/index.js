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
    this.provider = 'aws';
    this.commands = {};
    this.hooks = {
      'before:offline:start:init': this.startReadableStreams.bind(this)
    };
  }

  createHandler(location, fn) {
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
  }

  startReadableStreams() {
    const { config: { host: hostname, port, region } = {} } = this;
    const endpoint = new AWS.Endpoint(`http://${hostname}:${port}`);
    const offlineConfig =
      this.serverless.service.custom['serverless-offline'] || {};
    const fns = this.serverless.service.functions;

    let location = process.cwd();
    if (offlineConfig.location) {
      location = process.cwd() + '/' + offlineConfig.location;
    } else if (this.serverless.config.servicePath) {
      location = this.serverless.config.servicePath;
    }

    const streams = (this.config.streams || []).map(
      ({ table, functions = [] }) => ({
        table,
        functions: functions.map((functionName) => _.get(fns, functionName))
      })
    );

    streams.forEach(({ table, functions }) => {
      const subscriber = new DynamoDBSubscriber({
        table,
        endpoint,
        interval: '1s'
      });

      subscriber.on('record', (record, keys) => {
        functions.forEach((fn) => {
          if (fn) {
            const handler = this.createHandler(location, fn);
            handler({ Records: [record] });
          }
        });
      });
      subscriber.start();
    });
  }
}

module.exports = ServerlessPluginOfflineDynamodbStream;
