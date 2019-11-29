const { expect } = require('chai');
const EventEmitter = require('events');
const bunyan = require('bunyan');
const lookupObjectAction = require('../lib/actions/lookupObject');
require('dotenv').config();

class TestEmitter extends EventEmitter {
  constructor() {
    super();
    this.data = [];
    this.end = 0;
    this.error = [];
    this.logger = bunyan.createLogger({ name: 'dummy' });

    this.on('data', (value) => this.data.push(value));
    this.on('error', (value) => this.error.push(value));
    this.on('end', () => {
      this.end += 1;
    });
  }
}
// eslint-disable-next-line func-names
describe('SFTP integration test - lookup', function () {
  this.timeout(20000000);
  let host;
  let username;
  let password;
  let port;
  let directory;

  before(() => {
    if (!process.env.SFTP_HOSTNAME) { throw new Error('Please set SFTP_HOSTNAME env variable to proceed'); }
    host = process.env.SFTP_HOSTNAME;
    username = process.env.SFTP_USERNAME;
    password = process.env.PASSWORD;
    port = process.env.PORT;
    directory = '/www/olhav/';
  });

  it('Uploads, reads, and filters files by pattern match', async () => {
    const cfg = {
      host,
      username,
      password,
      port,
      directory,
    };
    const msg = {
      body: {
        filename: '1.txt',
      },
    };
    const res = await lookupObjectAction.process.call(new TestEmitter(), msg, cfg);
    expect(res).to.equal('1.txt');
  });
});
