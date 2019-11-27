const { expect } = require('chai');
const EventEmitter = require('events');
const bunyan = require('bunyan');
const Sftp = require('../lib/Sftp');
const deleteAction = require('../lib/actions/delete');
const upload = require('../lib/actions/upload');
const read = require('../lib/triggers/read');
require('dotenv').config();

const PROCESSED_FOLDER_NAME = '.elasticio_processed';

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
describe('SFTP integration test - upload then download', function () {
  this.timeout(20000000);
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

  it('Uploads attachment', async () => {
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
    await sftp.delete(`${cfg.directory}logo.svg`);
    await sftp.rmdir(cfg.directory, false);
  });

  it('Uploads and reads attachments', async () => {
    const cfg = {
      host,
      username,
      password,
      port,
      directory,
    };
    sftp = new Sftp(bunyan.createLogger({ name: 'dummy' }), cfg);
    await sftp.connect();

    await upload.process.call(new TestEmitter(), {
      body: {},
      attachments: {
        'logo.svg': {
          url: 'https://app.elastic.io/img/logo.svg',
        },
        'logo2.svg': {
          url: 'https://app.elastic.io/img/logo.svg',
        },
      },
    }, cfg);

    const receiver = new TestEmitter();
    const msg = {};
    await read.process.call(receiver, msg, cfg);
    expect(receiver.data.length).to.equal(2);
    expect(receiver.data[0].body.filename).to.equal('logo.svg');
    expect(receiver.data[0].body.size).to.equal(4379);
    expect(receiver.data[1].body.filename).to.equal('logo2.svg');
    expect(receiver.data[1].body.size).to.equal(4379);
    const logoFilename = (await sftp.list(`${cfg.directory}${PROCESSED_FOLDER_NAME}`))[0].name;
    const logo2Filename = (await sftp.list(`${cfg.directory}${PROCESSED_FOLDER_NAME}`))[1].name;
    await sftp.delete(`${cfg.directory}${PROCESSED_FOLDER_NAME}/${logoFilename}`);
    await sftp.delete(`${cfg.directory}${PROCESSED_FOLDER_NAME}/${logo2Filename}`);
    await sftp.rmdir(`${cfg.directory}${PROCESSED_FOLDER_NAME}`, false);
    await sftp.rmdir(cfg.directory, false);
  });

  it('Uploads and reads attachments with custom name', async () => {
    const cfg = {
      host,
      username,
      password,
      port,
      directory,
    };
    sftp = new Sftp(bunyan.createLogger({ name: 'dummy' }), cfg);
    await sftp.connect();

    await upload.process.call(new TestEmitter(), {
      body: { filename: 'custom.svg' },
      attachments: {
        'logo.svg': {
          url: 'https://app.elastic.io/img/logo.svg',
        },
        'logo2.svg': {
          url: 'https://app.elastic.io/img/logo.svg',
        },
      },
    }, cfg);

    const receiver = new TestEmitter();
    const msg = {};
    await read.process.call(receiver, msg, cfg);
    expect(receiver.data.length).to.equal(2);
    expect(receiver.data[0].body.filename).to.equal('custom_logo.svg');
    expect(receiver.data[0].body.size).to.equal(4379);
    expect(receiver.data[1].body.filename).to.equal('custom_logo2.svg');
    expect(receiver.data[1].body.size).to.equal(4379);
    const logoFilename = (await sftp.list(`${cfg.directory}${PROCESSED_FOLDER_NAME}`))[0].name;
    const logo2Filename = (await sftp.list(`${cfg.directory}${PROCESSED_FOLDER_NAME}`))[1].name;
    await sftp.delete(`${cfg.directory}${PROCESSED_FOLDER_NAME}/${logoFilename}`);
    await sftp.delete(`${cfg.directory}${PROCESSED_FOLDER_NAME}/${logo2Filename}`);
    await sftp.rmdir(`${cfg.directory}${PROCESSED_FOLDER_NAME}`, false);
    await sftp.rmdir(cfg.directory, false);
  });

  it('Uploads, read and deletes attachments with custom name', async () => {
    const cfg = {
      host,
      username,
      password,
      port,
      directory,
    };
    sftp = new Sftp(bunyan.createLogger({ name: 'dummy' }), cfg);
    await sftp.connect();

    await upload.process.call(new TestEmitter(), {
      body: { filename: 'custom.svg' },
      attachments: {
        'logo.svg': {
          url: 'https://app.elastic.io/img/logo.svg',
        },
        'logo2.svg': {
          url: 'https://app.elastic.io/img/logo.svg',
        },
      },
    }, cfg);

    const receiver = new TestEmitter();
    const msg = {};
    await read.process.call(receiver, msg, cfg);
    expect(receiver.data.length).to.equal(2);
    expect(receiver.data[0].body.filename).to.equal('custom_logo.svg');
    expect(receiver.data[0].body.size).to.equal(4379);
    expect(receiver.data[1].body.filename).to.equal('custom_logo2.svg');
    expect(receiver.data[1].body.size).to.equal(4379);

    const logoFilename = (await sftp.list(`${cfg.directory}${PROCESSED_FOLDER_NAME}`))[0].name;
    const logo2Filename = (await sftp.list(`${cfg.directory}${PROCESSED_FOLDER_NAME}`))[1].name;

    const upgradedCfg = JSON.parse(JSON.stringify(cfg));
    upgradedCfg.directory = `${cfg.directory}${PROCESSED_FOLDER_NAME}`;
    const deleteResult = await deleteAction.process.call(receiver,
      { body: { filename: logoFilename } }, upgradedCfg);
    const deleteResult2 = await deleteAction.process.call(receiver,
      { body: { filename: logo2Filename } }, upgradedCfg);

    expect(deleteResult.body.id).to.equal('custom_logo.svg');
    expect(deleteResult2.body.id).to.equal('custom_logo2.svg');

    await sftp.rmdir(`${cfg.directory}${PROCESSED_FOLDER_NAME}`, false);
    await sftp.rmdir(cfg.directory, false);
  });

  it('Uploads, reads, and filters files by pattern match', async () => {
    const cfg = {
      host,
      username,
      password,
      port,
      directory,
      pattern: 'pattern',
    };
    sftp = new Sftp(bunyan.createLogger({ name: 'dummy' }), cfg);
    await sftp.connect();

    await upload.process.call(new TestEmitter(), {
      body: {},
      attachments: {
        'logo.svg': {
          url: 'https://app.elastic.io/img/logo.svg',
        },
        'pattern.svg': {
          url: 'https://app.elastic.io/img/logo.svg',
        },
      },
    }, cfg);

    const list = await sftp.list(cfg.directory);
    expect(list.length).to.equal(2);
    expect(list[0].name).to.equal('logo.svg');
    expect(list[0].size).to.equal(4379);
    expect(list[1].name).to.equal('pattern.svg');
    expect(list[1].size).to.equal(4379);

    const receiver = new TestEmitter();
    const msg = {};
    await read.process.call(receiver, msg, cfg);

    expect(receiver.data.length).to.equal(1);
    expect(receiver.data[0].body.filename).to.equal('pattern.svg');
    expect(receiver.data[0].body.size).to.equal(4379);
    await sftp.delete(`${cfg.directory}logo.svg`);
    const patternFilename = (await sftp.list(`${cfg.directory}${PROCESSED_FOLDER_NAME}`))[0].name;
    await sftp.delete(`${cfg.directory}${PROCESSED_FOLDER_NAME}/${patternFilename}`);
    await sftp.rmdir(`${cfg.directory}${PROCESSED_FOLDER_NAME}`, false);
    await sftp.rmdir(cfg.directory, false);
  });

  afterEach(async () => {
    await sftp.end();
  });
});
