const { expect } = require('chai');
const EventEmitter = require('events');
const bunyan = require('bunyan');
const nock = require('nock');
const Sftp = require('../lib/Sftp');
const upload = require('../lib/actions/upload');
const poll = require('../lib/triggers/polling');
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
describe('SFTP integration test - polling', function () {
  this.timeout(2000000);
  let sftp;
  let host;
  let username;
  let password;
  let port;
  let directory;
  const testNumber = Math.floor(Math.random() * 10000);

  before(() => {
    if (!process.env.SFTP_HOSTNAME) { throw new Error('Please set SFTP_HOSTNAME env variable to proceed'); }
    host = process.env.SFTP_HOSTNAME;
    username = process.env.USERNAME;
    password = process.env.PASSWORD;
    port = process.env.PORT;
    directory = `/home/eiotesti/www/integration-test/test-${testNumber}/`;
  });

  it('Uploads and poll attachment', async () => {
    nock('https://api.elastic.io/', { encodedQueryParams: true })
      .post('/v2/resources/storage/signed-url')
      .reply(200, { put_url: 'http://api.io/some', get_url: 'http://api.io/some' });
    nock('http://api.io/', { encodedQueryParams: true })
      .put('/some').reply(200, { signedUrl: { put_url: 'http://api.io/some' } });

    const cfg = {
      host,
      username,
      password,
      port,
      directory,
    };
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
    const result = await upload.process.call(sender, msg, cfg);

    expect(result.body.results).to.be.an('array');
    expect(result.body.results.length).to.equal(1);
    expect(result.body.results[0].attachment).to.equal('logo.svg');
    const list = await sftp.list(cfg.directory);
    expect(list.length).to.equal(1);
    expect(list[0].name).to.equal('logo.svg');
    expect(list[0].size).to.equal(4379);

    await poll.process.call(sender, {}, cfg);

    expect(sender.data[0].body.path).to.equal(`${cfg.directory}logo.svg`);
    expect(sender.data[0].body.size).to.equal(4379);

    await sftp.delete(`${cfg.directory}logo.svg`);
    await sftp.rmdir(cfg.directory, false);
  });

  afterEach(async () => {
    await sftp.end();
  });
});
