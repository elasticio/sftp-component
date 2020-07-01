require('dotenv').config();
const chai = require('chai');
const EventEmitter = require('events');
const logger = require('@elastic.io/component-commons-library/lib/logger/logger').getLogger();
const sinon = require('sinon');
const SftpClient = require('ssh2-sftp-client');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const Sftp = require('../lib/Sftp');
const deleteAction = require('../lib/actions/delete');
const upload = require('../lib/actions/upload');
const read = require('../lib/triggers/read');
const lookupObject = require('../lib/actions/lookupObject');
const upsertFile = require('../lib/actions/upsertFile');
const moveFile = require('../lib/actions/moveFile');

const { expect } = chai;
chai.use(require('chai-as-promised'));

const PROCESSED_FOLDER_NAME = '.elasticio_processed';

class TestEmitter extends EventEmitter {
  constructor() {
    super();
    this.data = [];
    this.end = 0;
    this.error = [];
    this.logger = logger;

    this.on('data', (value) => this.data.push(value));
    this.on('error', (value) => this.error.push(value));
    this.on('end', () => {
      this.end += 1;
    });
  }
}

// eslint-disable-next-line func-names
describe('SFTP integration test - upload then download', () => {
  let sftp;
  let host;
  let username;
  let password;
  let port;
  let directory;
  let cfg;
  let sender;
  let receiver;
  const testNumber = Math.floor(Math.random() * 10000);

  before(async () => {
    if (!process.env.SFTP_HOSTNAME) {
      throw new Error('Please set SFTP_HOSTNAME env variable to proceed');
    }
    host = process.env.SFTP_HOSTNAME;
    username = process.env.SFTP_USER;
    password = process.env.SFTP_PASSWORD;
    port = process.env.PORT;
    directory = `/www/integration-test/test-${testNumber}/`;
    cfg = {
      host,
      username,
      password,
      port,
      directory,
    };
    sftp = new Sftp(logger, cfg);
    await sftp.connect();
  });

  beforeEach(async () => {
    cfg = {
      host,
      username,
      password,
      port,
      directory,
    };
    sender = new TestEmitter();
    receiver = new TestEmitter();
  });

  afterEach(() => {
    sinon.restore();
  });

  after(async () => {
    await sftp.end();
  });

  it('Uploads attachment', async () => {
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

    const msg = {};
    await read.process.call(receiver, msg, cfg);
    expect(receiver.data.length).to.equal(2);
    expect(receiver.data[0].body.filename).to.equal('logo2.svg');
    expect(receiver.data[0].body.size).to.equal(4379);
    expect(receiver.data[1].body.filename).to.equal('logo.svg');
    expect(receiver.data[1].body.size).to.equal(4379);
    const logoFilename = (await sftp.list(`${cfg.directory}${PROCESSED_FOLDER_NAME}`))[0].name;
    const logo2Filename = (await sftp.list(`${cfg.directory}${PROCESSED_FOLDER_NAME}`))[1].name;
    await sftp.delete(`${cfg.directory}${PROCESSED_FOLDER_NAME}/${logoFilename}`);
    await sftp.delete(`${cfg.directory}${PROCESSED_FOLDER_NAME}/${logo2Filename}`);
    await sftp.rmdir(`${cfg.directory}${PROCESSED_FOLDER_NAME}`, false);
    await sftp.rmdir(cfg.directory, false);
  });

  it('Uploads and reads attachments with custom name', async () => {
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

    const msg = {};
    await read.process.call(receiver, msg, cfg);
    expect(receiver.data.length).to.equal(2);
    expect(receiver.data[0].body.filename).to.equal('custom_logo.svg');
    expect(receiver.data[0].body.size).to.equal(4379);
    expect(receiver.data[1].body.filename).to.equal('custom_logo2.svg');
    expect(receiver.data[1].body.size).to.equal(4379);

    const logoFilename = (await sftp.list(`${cfg.directory}${PROCESSED_FOLDER_NAME}`))[0].name;
    const logo2Filename = (await sftp.list(`${cfg.directory}${PROCESSED_FOLDER_NAME}`))[1].name;

    const dir = `${cfg.directory}${PROCESSED_FOLDER_NAME}`;
    const deleteResult = await deleteAction.process.call(receiver,
      { body: { path: `${dir}/${logoFilename}` } }, cfg);
    const deleteResult2 = await deleteAction.process.call(receiver,
      { body: { path: `${dir}/${logo2Filename}` } }, cfg);

    expect(deleteResult.body.id).to.equal(`${dir}/${logoFilename}`);
    expect(deleteResult2.body.id).to.equal(`${dir}/${logo2Filename}`);

    await sftp.rmdir(`${cfg.directory}${PROCESSED_FOLDER_NAME}`, false);
    await sftp.rmdir(cfg.directory, false);
  });

  it('Uploads, reads, and filters files by pattern match', async () => {
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
    expect(list[0].name).to.equal('pattern.svg');
    expect(list[0].size).to.equal(4379);
    expect(list[1].name).to.equal('logo.svg');
    expect(list[1].size).to.equal(4379);

    const msg = {};
    cfg.pattern = 'pattern*';
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

  it('Uploads and lookup', async () => {
    const attachmentProcessorStub = sinon.stub(AttachmentProcessor.prototype, 'uploadAttachment');
    const callAttachmentProcessor = attachmentProcessorStub.returns({ config: { url: 'https://url' } });

    await upload.process.call(new TestEmitter(), {
      body: {
        filename: 'logo.svg',
      },
      attachments: {
        'logo.svg': {
          url: 'https://app.elastic.io/img/logo.svg',
        },
      },
    }, cfg);

    const list = await sftp.list(cfg.directory);
    expect(list.length).to.equal(1);
    expect(list[0].name).to.equal('logo.svg');

    const msg = {
      body: {
        path: `${directory}/logo.svg`,
      },
    };
    const result = await lookupObject.process.call(receiver, msg, cfg);
    expect(result.body.name).to.equal('logo.svg');
    expect(callAttachmentProcessor.calledOnce).to.be.equal(true);
    await sftp.delete(`${cfg.directory}logo.svg`);
    await sftp.rmdir(cfg.directory, false);
    attachmentProcessorStub.restore();
  });

  describe('Upsert File Tests', () => {
    // eslint-disable-next-line max-len
    const attachmentUrl1 = 'https://gist.githubusercontent.com/jhorbulyk/1bc92d62a7a530ce19c83a4f5b7a9f88/raw/62ab4e2e3028315c3472d622a279f13eb44c4f44/Hello%2520World%2520Gist';
    const attachmentUrl1ContentSize = 11;
    // eslint-disable-next-line max-len
    const attachmentUrl2 = 'https://gist.githubusercontent.com/jhorbulyk/e6ff536dac6e0caa1b2d2d0177e72855/raw/77b39d3cd443128becae7f1c1ed88950cd29e576/Hello%2520World%2520Gist%25202';
    const attachmentUrl2ContentSize = 15;
    let filename;
    beforeEach(() => {
      filename = `${directory}test.file`;
    });

    it('Relative Path Test', async () => {
      cfg = {
        host,
        username,
        password,
        port,
        updateBehavior: 'error',
      };

      sender = new TestEmitter();
      const msg = {
        body: {
          filename: filename.replace('/home/eiotesti/', './'),
          attachmentUrl: attachmentUrl1,
        },
      };
      const result = await upsertFile.process.call(sender, msg, cfg);

      expect(result.body.size).to.equal(attachmentUrl1ContentSize);
      const list = await sftp.list(directory);
      expect(list.length).to.equal(1);
      expect(list[0].name).to.equal('test.file');
      expect(list[0].size).to.equal(attachmentUrl1ContentSize);
    });

    it('Error Mode', async () => {
      cfg = {
        host,
        username,
        password,
        port,
        updateBehavior: 'error',
      };

      sender = new TestEmitter();
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
      cfg = {
        host,
        username,
        password,
        port,
        updateBehavior: 'overwrite',
      };

      sender = new TestEmitter();
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
      cfg = {
        host,
        username,
        password,
        port,
        updateBehavior: 'append',
      };

      sender = new TestEmitter();
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

    afterEach(async () => {
      await sftp.delete(filename);
      await sftp.rmdir(directory, false);
    });
  });

  describe('Move File Tests', () => {
    let mvTestDir;
    let fooPath;
    let barPath;
    let bazPath;

    before(() => {
      mvTestDir = `${directory}moveDir`;
      fooPath = `${mvTestDir}/foo.txt`;
      barPath = `${mvTestDir}/bar.txt`;
      bazPath = `${mvTestDir}/baz.txt`;
    });

    beforeEach(async () => {
      await sftp.mkdir(mvTestDir);
      await sftp.put(Buffer.from('foo'), fooPath);
      await sftp.put(Buffer.from('bar'), barPath);
    });

    afterEach(async () => {
      await sftp.rmdir(mvTestDir, true);
    });

    it('Posix No Conflict Move', async () => {
      const body = {
        filename: fooPath,
        newFilename: bazPath,
      };

      await moveFile.process.call(receiver, {
        body,
      }, cfg);

      expect(receiver.data[0].body).to.deep.equal(body);
      const dirResults = await sftp.list(mvTestDir);
      const dirNames = dirResults.map((f) => f.name).sort();
      expect(dirNames).to.deep.equal(['bar.txt', 'baz.txt']);
      const fileContents = await sftp.get(bazPath);
      expect(fileContents).to.deep.equal(Buffer.from('foo'));
    });

    it('Non Posix No Conflict Move', async () => {
      const stub = sinon.stub(SftpClient.prototype, 'posixRename');
      stub.throws(new Error('Server does not support this extended request'));
      const body = {
        filename: fooPath,
        newFilename: bazPath,
      };

      await moveFile.process.call(receiver, {
        body,
      }, cfg);

      expect(stub.called).to.be.true;
      expect(receiver.data[0].body).to.deep.equal(body);
      const dirResults = await sftp.list(mvTestDir);
      const dirNames = dirResults.map((f) => f.name).sort();
      expect(dirNames).to.deep.equal(['bar.txt', 'baz.txt']);
      const fileContents = await sftp.get(bazPath);
      expect(fileContents).to.deep.equal(Buffer.from('foo'));
    });

    it('Posix Overwrite', async () => {
      const body = {
        filename: fooPath,
        newFilename: barPath,
      };

      await moveFile.process.call(receiver, {
        body,
      }, cfg);

      expect(receiver.data[0].body).to.deep.equal(body);
      const dirResults = await sftp.list(mvTestDir);
      const dirNames = dirResults.map((f) => f.name).sort();
      expect(dirNames).to.deep.equal(['bar.txt']);
      const fileContents = await sftp.get(barPath);
      expect(fileContents).to.deep.equal(Buffer.from('foo'));
    });

    it('Non-Posix Overwrite', async () => {
      const stub = sinon.stub(SftpClient.prototype, 'posixRename');
      stub.throws(new Error('Server does not support this extended request'));
      const body = {
        filename: fooPath,
        newFilename: barPath,
      };

      await moveFile.process.call(receiver, {
        body,
      }, cfg);

      expect(stub.called).to.be.true;
      expect(receiver.data[0].body).to.deep.equal(body);
      const dirResults = await sftp.list(mvTestDir);
      const dirNames = dirResults.map((f) => f.name).sort();
      expect(dirNames).to.deep.equal(['bar.txt']);
      const fileContents = await sftp.get(barPath);
      expect(fileContents).to.deep.equal(Buffer.from('foo'));
    });
  });
});
