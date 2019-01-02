const Readable = require('stream').Readable;
const debug = require('debug')('DynamoDBStream-streams:readable');

function sleep(timeout, shouldWait, ...args) {
  if (shouldWait || timeout === 0) {
    return Promise.resolve(...args);
  }

  return new Promise((resolve) => {
    setTimeout(() => resolve(...args), timeout);
  });
}

function timeout(func, timeout, ...args) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(func(...args)), timeout);
  });
}

class DynamoDBStreamReadable extends Readable {
  constructor(client, streamArn, pollForever, options = {}) {
    if (!client) {
      throw new Error('client is required');
    }
    if (!streamArn) {
      throw new Error('streamArn is required');
    }

    super(Object.assign({ objectMode: true }, options));

    this.client = client;
    this.streamArn = streamArn;
    this.options = {
      interval: 2000,
      parser: JSON.parse
    };
    this.pollForever = !!pollForever;
    this._started = 0;
  }

  getShard() {
    const params = {
      StreamArn: this.streamArn
    };
    return this.client
      .describeStream(params)
      .promise()
      .then((data) => {
        if (!data.StreamDescription.Shards.length) {
          throw new Error('No shards!');
        }

        debug('getShard found %d shards', data.StreamDescription.Shards.length);

        const [openShard] = data.StreamDescription.Shards.filter(
          (shard) => !shard.SequenceNumberRange.EndingSequenceNumber
        );

        return openShard && openShard.ShardId;
      });
  }

  getShardIterator(shardId, options) {
    const params = Object.assign(
      {
        ShardId: shardId,
        ShardIteratorType: 'LATEST',
        StreamArn: this.streamArn
      },
      options || {}
    );
    return this.client
      .getShardIterator(params)
      .promise()
      .then((data) => {
        debug('getShardIterator got iterator id: %s', data.ShardIterator);
        return data.ShardIterator;
      });
  }

  _startDynamoDBStream(size, shardIteratorOptions = {}) {
    return this.getShard()
      .then((shardId) => this.getShardIterator(shardId, shardIteratorOptions))
      .then((shardIterator) => this.readShard(shardIterator, size))
      .then((shardIterator) => {
        if (!shardIterator && this.pollForever) {
          debug('stream ended -- pollForever enabled -- restarting');
          return timeout(this._startDynamoDBStream.bind(this), 2000, size);
        }

        return shardIterator;
      })
      .catch((err) => {
        if (err.code === 'ExpiredIteratorException') {
          if (this.pollForever) {
            debug(
              'readShard - ExpiredIteratorException -- pollForever enabled -- restarting'
            );
            return this._startDynamoDBStream(size);
          }
          this.emit('error', err) || console.log(err, err.stack);
        } else if (err.code === 'TrimmedDataAccessException') {
          debug(
            'readShard - TrimmedDataAccessException -> restart dynamodb stream'
          );
          const refetchShardIteratorOptions = {
            ShardIteratorType: 'TRIM_HORIZON'
          };
          return this._startDynamoDBStream(size, refetchShardIteratorOptions);
        } else {
          this.emit('error', err) || console.log(err, err.stack);
        }
      });
  }

  readShard(shardIterator, size) {
    const params = {
      ShardIterator: shardIterator,
      Limit: size
    };
    return this.client
      .getRecords(params)
      .promise()
      .then((data) => {
        if (data.MillisBehindLatest > 60 * 1000) {
          debug('behind by %d milliseconds', data.MillisBehindLatest);
        }
        if (data.Records.length) {
          this.push(data);
          this.emit(
            'checkpoint',
            data.Records[data.Records.length - 1].SequenceNumber
          );
        }
        if (!data.NextShardIterator) {
          debug('readShard.closed %s', shardIterator);
        }

        return {
          nextShardIterator: data.NextShardIterator,
          hasData: data.Records.length > 0
        };
      })
      .then(({ nextShardIterator, hasData }) => {
        if (nextShardIterator) {
          return sleep(this.options.interval, hasData, nextShardIterator);
        }

        return null;
      })
      .then((nextShardIterator) => {
        if (nextShardIterator) {
          return this.readShard(nextShardIterator, size);
        }

        return null;
      });
  }

  _read(size) {
    if (this._started) {
      return;
    }

    this._startDynamoDBStream(size)
      .then(() => {
        this._started = 2;
      })
      .catch((err) => {
        this.emit('error', err) || console.log(err, err.stack);
      });
    this._started = 1;
  }
}

module.exports = DynamoDBStreamReadable;
