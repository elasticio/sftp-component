const { expect } = require('chai');
const EventEmitter = require('events');
const bunyan = require('bunyan');
const fs = require('fs');
const Sftp = require('../lib/Sftp');
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
      this.end += 1;
      done();
    });
  }
}

// eslint-disable-next-line func-names
describe('SFTP integration test - upload then download', function () {
  this.timeout(20000000);
  let cfg;
  let sftp;
  before(() => {
    if (fs.existsSync('.env')) {
      // eslint-disable-next-line global-require
      require('dotenv').config();
    }
    if (!process.env.HOSTNAME) { throw new Error('Please set HOSTNAME env variable to proceed'); }
    cfg = {
      host: process.env.HOSTNAME,
      username: process.env.USER,
      password: process.env.PASSWORD,
      port: process.env.PORT,
      directory: `/home/eiotesti/www/integration-test/test-${Math.floor(Math.random() * 10000)}/`,
    };
  });

  it('upload attachment', async () => {
    sftp = new Sftp(bunyan.createLogger({ name: 'dummy' }), cfg);
    await sftp.connect();

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
    expect(sender.data.length).to.equal(1);
    expect(sender.data[0].body.results).to.be.an('array');
    expect(sender.data[0].body.results.length).to.equal(1);
    const list = await sftp.list(cfg.directory);
    expect(list.length).to.equal(1);
    expect(list[0].name).to.equal('logo.svg');
    expect(list[0].size).to.equal(4379);
  });

  after(async () => {
    await sftp.delete(`${cfg.directory}logo.svg`);
    await sftp.rmdir(cfg.directory, false);
    await sftp.end();
  });
});
