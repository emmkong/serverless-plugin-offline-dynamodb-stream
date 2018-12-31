# serverless-plugin-offline-dynamodb-stream

[![CircleCI Status][circleci-badge]][circleci-url]
[![NPM Version][npm-badge]][npm-url]
[![License][license-badge]][license-url]

> Serverless framework offline plugin to support dynamodb stream

This plugin pull from dynamodb stream and trigger serverless function if any records detected.

# Installation

Install package

```bash
$ npm install --save serverless-plugin-offline-dynamodb-stream
```

# Usage

Add following config to serverless.yml file.

```yml
plugins:
  - serverless-plugin-offline-dynamodb-stream
  - serverless-plugin-offline-kinesis-stream
custom:
  dynamodbStream:
    host: {LOCAL_DYNAMODB_HOST}
    port: {LOCAL_DYNAMODB_PORT}
    pollForever: boolean
    streams:
      - table: {TABLE_NAME}
        functions:
          - {FUNCTION_NAME}
  kinesisStream:
    host: {LOCAL_KINESIS_HOST}
    port: {LOCAL_KINESIS_PORT}
    intervalMillis: 5000
    streams:
      - streamName: {STREAM_NAME}
        functions:
          - {FUNCTION_NAME}
```

#### pollForever
* can be set to `true` to indicate that this plugin should continue to poll for dynamodbstreams events indefinity. if
`pollForever` is not set, or is set to false, the plugin will stop polling for events once the end of the
stream is reached (when dynamodbstreams.getRecords => data.NextShardIterator === null). this can be useful in scenarios where you have a lambda function as part of a larger service struture, and the other services depend on the functinality in the lambda.

Ensure your local dynamodb is up and running, or you could also consider using [serverless-dynamodb-local](https://github.com/99xt/serverless-dynamodb-local) plugin before start your serverless offline process.

```bash
$ serverless offline start
```

# Development

* Cloning the repo

```bash
$ git clone https://github.com/orchestrated-io/serverless-plugin-offline-dynamodb-stream.git
```

* Installing dependencies

```bash
$ npm install
```

* Running scripts

| Action                                   | Usage               |
| ---------------------------------------- | ------------------- |
| Linting code                             | `npm run lint`      |
| Running unit tests                       | `npm run jest`      |
| Running code coverage                    | `npm run coverage`  |
| Running lint + tests                     | `npm test`          |

# Demo

```
> cd demo
> docker-compose up --build
```

* open [dynamodb admin](http://localhost:8001/tables/items/items) in browser.
* adding new item on items table will result event detail printed out in console.

# Author

[Emmanuel Kong](https://github.com/emmkong)

# License

[MIT](https://github.com/orchestrated-io/serverless-plugin-offline-dynamodb-stream/blob/master/LICENSE)

[circleci-badge]: https://circleci.com/gh/orchestrated-io/serverless-plugin-offline-dynamodb-stream/tree/master.svg?style=shield
[circleci-url]: https://circleci.com/gh/orchestrated-io/serverless-plugin-offline-dynamodb-stream

[npm-badge]: https://img.shields.io/npm/v/serverless-plugin-offline-dynamodb-stream.svg
[npm-url]: https://www.npmjs.com/package/serverless-plugin-offline-dynamodb-stream

[license-badge]: https://img.shields.io/github/license/orchestrated-io/serverless-plugin-offline-dynamodb-stream.svg
[license-url]: https://opensource.org/licenses/MIT
