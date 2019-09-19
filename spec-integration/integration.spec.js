const { expect } = require('chai');
const EventEmitter = require('events');
const Client = require('ssh2-sftp-client');
const fs = require('fs');
const upload = require('../lib/actions/upload');

class TestEmitter extends EventEmitter {
  constructor(done) {
    super();
    this.data = [];
    this.end = 0;
    this.error = [];

    this.on('data', (value) => this.data.push(value));
    this.on('error', (value) => this.error.push(value));
    this.on('end', () => {
      this.end++;
      done();
    });
  }
}

// eslint-disable-next-line func-names
describe('SFTP integration test - upload then download', function () {
  this.timeout(20000000);
  let host;
  let username;
  let password;
  let port;
  let cfg;
  before(() => {
    if (fs.existsSync('.env')) {
      require('dotenv').config();
    }
    if (!process.env.HOSTNAME) { throw new Error('Please set HOSTNAME env variable to proceed'); }
    host = process.env.HOSTNAME;
    username = process.env.USER;
    password = process.env.PASSWORD;
    port = process.env.PORT;
  });
  const sftp = new Client();

  it('upload attachment', async () => {
    cfg = {
      host,
      username,
      password,
      port,
      directory: `/home/eiotesti/www/integration-test/test-${Math.floor(Math.random() * 10000)}/`,
    };
    await upload.init(cfg);
    await sftp.connect(cfg);

    console.log('Starting test');
    const sender = new TestEmitter();
    const msg = {
      body: {},
      attachments: {
        'logo.svg': {
          url: 'https://app.elastic.io/img/logo.svg',
        },
      },
    };
    await upload.process.call(sender, msg, cfg);
    console.log('Checking response');
    expect(sender.data.length).equal(1);
    expect(sender.data[0].body.results).to.be.an('array');
    expect(sender.data[0].body.results.length).equal(1);
    console.log('Checking SFTP contents');
    const list = await sftp.list(cfg.directory);
    expect(list.length).equal(1);
    expect(list[0].name).equal('logo.svg');
    expect(list[0].size).equal(4379);
  });

  after(async () => {
    console.log('Cleaning-up directory %s', cfg.directory);
    await sftp.rmdir(cfg.directory, true);
    console.log('Cleanup completed, closing connection');
    sftp.end();
    upload.shutdown();
  });
});
