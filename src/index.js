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
    this.commands = {
      streams: {
        commands: {
          start: {
            lifecycleEvents: ['addStreamHandler'],
            usage:
              'Will add a stream listener given TABLE and FUNCTION variables',
            options: {
              table: {
                usage: 'Specify the table you want the stream listener on',
                required: true,
                shortcut: 't'
              },
              funct: {
                usage: 'Specify the name of the function you want to invoke',
                required: true,
                shortcut: 'f'
              },
              build: {
                usage:
                  'Specify whether you want webpack build to happen before adding the listener',
                required: false,
                shortcut: 'b'
              }
            }
          }
        }
      }
    };
    this.hooks = {
      'before:offline:start:init': this.startReadableStreams.bind(this),
      'streams:start:addStreamHandler': this.startStreamHandler.bind(this)
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

  startStreamHandler() {
    const {
      options: { table, funct, build },
      config: { host: hostname, port, region, webpack = false } = {}
    } = this;
    const endpoint = new AWS.Endpoint(`http://${hostname}:${port}`);

    const lambda = _.get(this.serverless.service.functions, funct);

    let location = this.getLocation();
    if (webpack) {
      location = location + '/.webpack/service';
    }

    this.runWebpack(webpack && build).then(() => {
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

          const functionExecutable = FunctionExecutable(location, [lambda]);
          this.startOneReadableStream(endpoint, streamArn, functionExecutable);
        }
      });
    });
  }

  runWebpack(webpack) {
    if (webpack) {
      return this.serverless.pluginManager
        .spawn('webpack:validate')
        .then(() => this.serverless.pluginManager.spawn('webpack:compile'))
        .then(() => this.serverless.pluginManager.spawn('webpack:package'));
    } else {
      return Promise.resolve();
    }
  }

  startOneReadableStream(endpoint, streamArn, functionExecutable) {
    const { config: { region, batchSize, pollForever = false } = {} } = this;
    const ddbStream = endpoint
      ? new AWS.DynamoDBStreams({
          region,
          endpoint
        })
      : new AWS.DynamoDBStreams({ region });

    const readable = new DynamoDBStreamReadable(
      ddbStream,
      streamArn,
      pollForever,
      {
        highWaterMark: batchSize
      }
    );

    readable.on('error', (error) => {
      console.log(
        `DynamoDBStreamReadable error... terminating stream... Error => ${error}`
      );
      functionExecutable.destroy(error);
    });

    readable.pipe(functionExecutable).on('end', () => {
      console.log(`stream [${streamArn}] closed!`);
    });
  }

  getLocation() {
    const offlineConfig =
      this.serverless.service.custom['serverless-offline'] || {};

    let location = process.cwd();
    if (offlineConfig.location) {
      location = process.cwd() + '/' + offlineConfig.location;
    } else if (this.serverless.config.servicePath) {
      location = this.serverless.config.servicePath;
    }

    return location;
  }

  startReadableStreams() {
    const {
      config: { host: hostname, port, region } = {},
      serverless: { service: { provider: { environment } = {} } = {} } = {}
    } = this;
    const endpoint = new AWS.Endpoint(`http://${hostname}:${port}`);

    const fns = this.serverless.service.functions;

    process.env = Object.assign({}, process.env, environment);
    const location = this.getLocation();

    const streams = (this.config.streams || []).map(
      ({ table, functions = [] }) => ({
        table,
        functions: functions.map((functionName) => _.get(fns, functionName))
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
          const functionExecutable = FunctionExecutable(location, functions);

          this.startOneReadableStream(endpoint, streamArn, functionExecutable);
        }
      });
    });
  }
}

module.exports = ServerlessPluginOfflineDynamodbStream;
