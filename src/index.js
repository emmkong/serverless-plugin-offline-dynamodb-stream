const _ = require('lodash');
const AWS = require('aws-sdk');
const requireWithoutCache = require('require-without-cache');
const DynamoDBStreamReadable = require('./DynamoDBStreamReadable');
const FunctionExecutable = require('./FunctionExecutable');

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
      'before:offline:start:init': this.startReadableStreams.bind(this),
    };
  }

  createHandler(location, fn) {
    const handler = requireWithoutCache(
      location + '/' + fn.handler.split('.')[0],
      require
    )[fn.handler.split('/').pop().split('.')[1]];
    return (event, context = {}) => handler(event, context);
  }

  startReadableStreams() {
    const {
      config: {
        host: hostname,
        port,
        region,
        batchSize,
        pollForever = false,
      } = {},
      serverless: { service: { provider: { environment } = {} } = {} } = {},
    } = this;
    const endpoint = new AWS.Endpoint(`http://${hostname}:${port}`);
    const offlineConfig =
      this.serverless.service.custom['serverless-offline'] || {};
    const fns = this.serverless.service.functions;

    process.env = Object.assign({}, process.env, environment);

    let location = process.cwd();
    if (offlineConfig.location) {
      location = process.cwd() + '/' + offlineConfig.location;
    } else if (this.serverless.config.servicePath) {
      location = this.serverless.config.servicePath;
    }

    const streams = (this.config.streams || []).map(
      ({ table, functions = [] }) => ({
        table,
        functions: functions.map((functionName) => _.get(fns, functionName)),
      })
    );

    streams.forEach(({ table, functions }) => {
      const dynamo = endpoint
        ? new AWS.DynamoDB({ region, endpoint })
        : new AWS.DynamoDB({ region });
      dynamo.describeTable({ TableName: table }, (err, tableDescription) => {
        if (err) {
          throw err;
        }
        if (
          tableDescription &&
          tableDescription.Table &&
          tableDescription.Table.LatestStreamArn
        ) {
          const streamArn = tableDescription.Table.LatestStreamArn;

          const ddbStream = endpoint
            ? new AWS.DynamoDBStreams({
                region,
                endpoint,
              })
            : new AWS.DynamoDBStreams({ region });

          const readable = new DynamoDBStreamReadable(
            ddbStream,
            streamArn,
            pollForever,
            {
              highWaterMark: batchSize,
            }
          );

          const functionExecutable = FunctionExecutable(location, functions);

          readable.on('error', (error) => {
            console.log(
              `DynamoDBStreamReadable error... terminating stream... Error => ${error}`
            );
            functionExecutable.destroy(error);
          });

          readable.pipe(functionExecutable).on('end', () => {
            console.log(`stream for table [${table}] closed!`);
          });
        }
      });
    });
  }
}

module.exports = ServerlessPluginOfflineDynamodbStream;
