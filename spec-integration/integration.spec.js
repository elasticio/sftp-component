const chai = require('chai');
const { expect } = chai;
const EventEmitter = require('events');
const bunyan = require('bunyan');
const Sftp = require('../lib/Sftp');
const upload = require('../lib/actions/upload');
const read = require('../lib/triggers/read');
const upsertFile = require('../lib/actions/upsertFile');
require('dotenv').config();
chai.use(require('chai-as-promised'));

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
describe('SFTP integration test', function () {
  this.timeout(20000000);
  let sftp;
  let host;
  let username;
  let password;
  let port;
  let directory;
  const testNumber = Math.floor(Math.random() * 10000);

  before(() => {
    if (!process.env.HOSTNAME) { throw new Error('Please set HOSTNAME env variable to proceed'); }
    host = process.env.HOSTNAME;
    username = process.env.USER_NAME;
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

  describe('Upsert File Tests', function() {
    const attachmentUrl1 = 'https://gist.githubusercontent.com/jhorbulyk/1bc92d62a7a530ce19c83a4f5b7a9f88/raw/62ab4e2e3028315c3472d622a279f13eb44c4f44/Hello%2520World%2520Gist';
    const attachmentUrl1ContentSize = 11;
    const attachmentUrl2 = 'https://gist.githubusercontent.com/jhorbulyk/e6ff536dac6e0caa1b2d2d0177e72855/raw/77b39d3cd443128becae7f1c1ed88950cd29e576/Hello%2520World%2520Gist%25202';
    const attachmentUrl2ContentSize = 15;
    let filename;
    beforeEach(() => {
      filename = `${directory}test.file`;
    });


    it('Error Mode', async () => {
      const cfg = {
        host,
        username,
        password,
        port,
        updateBehavior: 'error'
      };

      sftp = new Sftp(bunyan.createLogger({ name: 'dummy' }), cfg);
      await sftp.connect();

      const sender = new TestEmitter();
      const msg = {
        body: {
          filename,
          attachmentUrl: attachmentUrl1,
        },
      };
      const result = await upsertFile.process.call(sender, msg, cfg);

      expect(result.body.size).to.equal(attachmentUrl1ContentSize);
      const list = await sftp.list(directory);
      expect(list.length).to.equal(1);
      expect(list[0].name).to.equal('test.file');
      expect(list[0].size).to.equal(attachmentUrl1ContentSize);

      await expect(upsertFile.process.call(sender, msg, cfg)).to.be.rejectedWith(`File ${filename} exists. File updates are not permissible as per the current configuration.`);
    });

    it('Overwrite Mode', async () => {
      const cfg = {
        host,
        username,
        password,
        port,
        updateBehavior: 'overwrite'
      };

      sftp = new Sftp(bunyan.createLogger({ name: 'dummy' }), cfg);
      await sftp.connect();

      const sender = new TestEmitter();
      const msg1 = {
        body: {
          filename,
          attachmentUrl: attachmentUrl1,
        },
      };
      const result1 = await upsertFile.process.call(sender, msg1, cfg);

      expect(result1.body.size).to.equal(attachmentUrl1ContentSize);
      let list = await sftp.list(directory);
      expect(list.length).to.equal(1);
      expect(list[0].name).to.equal('test.file');
      expect(list[0].size).to.equal(attachmentUrl1ContentSize);

      const msg2 = {
        body: {
          filename,
          attachmentUrl: attachmentUrl2,
        },
      };
      const result2 = await upsertFile.process.call(sender, msg2, cfg);

      expect(result2.body.size).to.equal(attachmentUrl2ContentSize);
      list = await sftp.list(directory);
      expect(list.length).to.equal(1);
      expect(list[0].name).to.equal('test.file');
      expect(list[0].size).to.equal(attachmentUrl2ContentSize);
    });

    it('Append Mode', async () => {
      const cfg = {
        host,
        username,
        password,
        port,
        updateBehavior: 'append'
      };

      sftp = new Sftp(bunyan.createLogger({ name: 'dummy' }), cfg);
      await sftp.connect();

      const sender = new TestEmitter();
      const msg1 = {
        body: {
          filename,
          attachmentUrl: attachmentUrl1,
        },
      };
      const result1 = await upsertFile.process.call(sender, msg1, cfg);

      expect(result1.body.size).to.equal(attachmentUrl1ContentSize);
      let list = await sftp.list(directory);
      expect(list.length).to.equal(1);
      expect(list[0].name).to.equal('test.file');
      expect(list[0].size).to.equal(attachmentUrl1ContentSize);

      const msg2 = {
        body: {
          filename,
          attachmentUrl: attachmentUrl2,
        },
      };
      const result2 = await upsertFile.process.call(sender, msg2, cfg);

      expect(result2.body.size).to.equal(attachmentUrl1ContentSize + attachmentUrl2ContentSize);
      list = await sftp.list(directory);
      expect(list.length).to.equal(1);
      expect(list[0].name).to.equal('test.file');
      expect(list[0].size).to.equal(attachmentUrl1ContentSize + attachmentUrl2ContentSize);
    });

    afterEach(async() => {
      await sftp.delete(filename);
      await sftp.rmdir(directory, false);
    });

    after(async() => {
      await upsertFile.shutdown();
    })
  });

  afterEach(async () => {
    await sftp.end();
  });
});
