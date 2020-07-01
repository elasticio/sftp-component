/* eslint-disable no-unused-expressions */
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { EventEmitter } = require('events');
const bunyan = require('bunyan');
const sinon = require('sinon');
const { expect } = require('chai');
const attachments = require('../../lib/attachments');
const readFile = require('../utils/readFile');
const Sftp = require('../../lib/Sftp');
const component = require('../../lib/triggers/read');
require('dotenv').config();

describe('SFTP', () => {
  const sftp = new Sftp(bunyan.createLogger({ name: 'dummy' }), {
    host: process.env.SFTP_HOSTNAME,
    port: Number(process.env.PORT),
    username: process.env.USERNAME,
    password: process.env.PASSWORD,
  });
  let endStub;
  let connectStub;
  let attachmentsStub;
  let opendirStub;
  let mkdirStub;
  let renameStub;
  const client = {
    opendir: () => null,
    readdir: () => null,
    rename: () => null,
    mkdir: () => null,
    createReadStream: () => null,
  };

  let files = [];
  let opendirError = null;
  let readDirError = null;
  let readdirCalled = false;

  beforeEach(() => {
    connectStub = sinon.stub(sftp, 'connect').callsFake();

    opendirStub = sinon.stub(client, 'opendir').callsFake((dir, callback) => {
      callback(opendirError);
    });

    sinon.stub(client, 'readdir').callsFake((handle, callback) => {
      const result = readdirCalled ? false : files;

      readdirCalled = true;

      callback(readDirError, result);
    });

    endStub = sinon.stub(sftp, 'end').callsFake();

    attachmentsStub = sinon.stub(attachments, 'addAttachment').callsFake((msg, fileName) => {
      // eslint-disable-next-line no-param-reassign
      msg.attachments[fileName] = {
        url: 'http://loremipsum',
      };
      return new Promise((res) => res(msg));
    });

    renameStub = sinon.stub(client, 'rename').callsFake((oldName, newName, callback) => {
      callback();
    });

    mkdirStub = sinon.stub(client, 'mkdir').callsFake((path, opts, cb) => {
      cb(null);
    });
  });

  afterEach(() => {
    files = [];
    opendirError = null;
    readDirError = null;
    readdirCalled = false;
    sinon.restore();
  });
  const runAndExpect = async (msg, cfg, cb) => {
    let newMsg; let newSnapshot; let err;
    const emitter = new EventEmitter();

    emitter.logger = bunyan.createLogger({ name: 'dummy' });
    emitter
      .on('data', (data) => {
        newMsg = data;
      })
      .on('error', (e) => {
        err = e;
      })
      .on('end', () => {});

    await component.process.call(emitter, msg, cfg);

    cb(err, newMsg, newSnapshot);
  };

  it('Failed to connect', () => {
    const msg = {};
    const cfg = {};

    runAndExpect(msg, cfg, (err, newMsg, newSnapshot) => {
      expect(err.message).to.equal('Ouch!');

      expect(newMsg).to.be.undefined;

      expect(newSnapshot).to.be.undefined;

      expect(endStub.callCount).to.equal(0);
    });
  });

  it('No such directory', () => {
    const msg = {};
    const cfg = {};

    opendirError = new Error('No such file or directory');

    runAndExpect(msg, cfg, (err, newMsg, newSnapshot) => {
      expect(err.message).to.equal('No such file or directory');

      expect(newMsg).to.be.undefined;

      expect(newSnapshot).to.be.undefined;

      expect(endStub.callCount).to.equal(1);
    });
  });

  it('Failed to read directory', () => {
    const msg = {};
    const cfg = {};

    readDirError = new Error('Failed to read given directory');

    runAndExpect(msg, cfg, (err, newMsg, newSnapshot) => {
      expect(err.message).to.equal('Failed to read given directory');

      expect(newMsg).to.be.undefined;

      expect(newSnapshot).to.be.undefined;

      expect(endStub.callCount > 0).to.equal(true);
    });
  });

  it('Invalid file pattern causes exception', () => {
    const msg = {};

    const cfg = {
      pattern: '***',
    };

    files = false;

    runAndExpect(msg, cfg, (err, newMsg, newSnapshot) => {
      expect(err.message).to.equal('Invalid regular expression: /***/: Nothing to repeat');

      expect(newMsg).to.be.undefined;

      expect(newSnapshot).to.be.undefined;

      expect(endStub.callCount > 0).to.equal(true);
    });
  });

  it('No files available', () => {
    const msg = {};
    const cfg = {};

    files = false;

    runAndExpect(msg, cfg, (err, newMsg, newSnapshot) => {
      expect(err).to.be.undefined;

      expect(newMsg).to.be.undefined;

      expect(newSnapshot).to.be.undefined;

      expect(endStub.callCount > 0).to.equal(true);
    });
  });

  it('No files available in given directory', () => {
    const msg = {};
    const cfg = {
      directory: 'aDir',
    };

    files = false;

    runAndExpect(msg, cfg, (err, newMsg, newSnapshot) => {
      expect(err).to.be.undefined;

      expect(newMsg).to.be.undefined;

      expect(newSnapshot).to.be.undefined;

      expect(endStub.callCount > 0).to.equal(true);
    });
  });

  it('File name does not match given pattern', () => {
    const msg = {};
    const cfg = {
      pattern: 'aaa',
    };

    files = [
      {
        filename: 'foo.xml',
        longname: '-rw-r--r--    1 democommercetools ftpcreator       94 Aug 14 08:25 foo.xml',
        attrs: {
          size: 94,
        },
      },
    ];

    runAndExpect(msg, cfg, (err, newMsg, newSnapshot) => {
      expect(err).to.be.undefined;

      expect(newMsg).to.be.undefined;

      expect(newSnapshot).to.be.undefined;

      expect(endStub.callCount > 0).to.equal(true);
    });
  });

  it('File is a folder', () => {
    const msg = {};
    const cfg = {};

    files = [
      {
        filename: 'aFolder',
        longname: 'drwxr-xr-x    1 democommercetools ftpcreator       94 Aug 14 08:25 aFolder',
        attrs: {
          size: 120,
        },
      },
    ];

    runAndExpect(msg, cfg, (err, newMsg, newSnapshot) => {
      expect(err).to.be.undefined;

      expect(newMsg).to.be.undefined;

      expect(newSnapshot).to.be.undefined;

      expect(endStub.callCount > 0).to.equal(true);
    });
  });

  it('File exceeds maximal file size', () => {
    const msg = {};
    const cfg = {};

    files = [
      {
        filename: 'data.xml',
        longname: '-rw-r--r--    1 democommercetools ftpcreator       94 Aug 14 08:25 data.xml',
        attrs: {
          size: 104857601,
        },

      },
    ];

    runAndExpect(msg, cfg, (err, newMsg, newSnapshot) => {
      expect(err).to.be.undefined;

      expect(newMsg).to.be.undefined;

      expect(newSnapshot).to.be.undefined;

      expect(endStub.callCount > 0).to.equal(true);
    });
  });

  it('File read successfully', () => {
    const msg = {};
    const cfg = {};

    files = [
      {
        filename: 'data.xml',
        longname: '-rw-r--r--    1 democommercetools ftpcreator       94 Aug 14 08:25 data.xml',
        attrs: {
          size: 10,
        },
      },
      {
        filename: '.elasticio_processed',
        longname: 'drwxr-xr-x    1 democommercetools ftpcreator       94 Aug 14 08:25 .elasticio_processed',
        attrs: {
          size: 10,
        },
      },
    ];

    const attachmentProcessor = new AttachmentProcessor();

    sinon.stub(attachmentProcessor, 'getAttachment').callsFake(() => ({
      filename: 'data.xml',
      size: 10,
    }));

    runAndExpect(msg, cfg, (err, newMsg, newSnapshot) => {
      expect(err).to.be.undefined;

      const attachment = newMsg.attachments['data.xml'];

      expect(attachment.url).to.equal('http://loremipsum');
      expect(attachmentsStub.getCall(0).args[0]).to.equal(newMsg);
      expect(attachmentsStub.getCall(0).args[1]).to.equal('data.xml');
      // expect(attachmentsStub.getCall(0).args[2]).to.equal(stream);
      expect(attachmentsStub.getCall(0).args[3]).to.equal(10);
      expect(newSnapshot).to.be.undefined;
      expect(connectStub.getCall(0).args[0]).to.equal(cfg);
      expect(opendirStub.getCall(0).args[0]).to.equal('/');
      expect(endStub.callCount > 0).to.equal(true);
      expect(renameStub.callCount > 0).to.equal(true);

      const renameCall = renameStub.getCall(0);
      expect(renameCall.args[0]).to.equal('/data.xml');
      expect(renameCall.args[1].includes('/.elasticio_processed/data.xml')).to.equal(true);
    });
  });

  it('File read and create processed folder', () => {
    const msg = {};
    const cfg = {};

    files = [
      {
        filename: 'data.xml',
        longname: '-rw-r--r--    1 democommercetools ftpcreator       94 Aug 14 08:25 data.xml',
        attrs: {
          size: 10,
        },
      },
    ];

    const xml = '<?xml version=\'1.0\' encoding=\'UTF-8\' ?><root><child/></root>';

    sinon.stub(readFile, 'readFile').callsFake((client2, path, callback) => {
      callback(null, Buffer.from(xml));
    });

    const attachmentProcessor = new AttachmentProcessor();

    sinon.stub(attachmentProcessor, 'getAttachment').callsFake(() => ({
      data: 'stream',
    }));

    runAndExpect(msg, cfg, (err, newMsg, newSnapshot) => {
      expect(err).to.be.undefined;

      const attachment = newMsg.attachments['data.xml'];

      expect(attachment.url).to.equal('http://loremipsum');

      expect(attachmentsStub.getCall(0).args[0]).to.equal(newMsg);
      expect(attachmentsStub.getCall(0).args[1]).to.equal('data.xml');
      // expect(attachmentsStub.getCall(0).args[2]).to.equal(stream);
      expect(attachmentsStub.getCall(0).args[3]).to.equal(10);

      expect(newSnapshot).to.be.undefined;

      expect(connectStub.getCall(0).args[0]).to.equal(cfg);

      expect(opendirStub.getCall(0).args[0]).to.equal('/');
      expect(endStub.callCount > 0).to.equal(true);

      expect(mkdirStub.getCall(0).args[0]).to.equal('/.elasticio_processed');
      expect(mkdirStub.getCall(0).args[1]).to.deep.equal({
        mode: 16877,
      });

      expect(renameStub.callCount > 0).to.equal(true);

      const renameCall = renameStub.getCall(0);
      expect(renameCall.args[0]).to.equal('/data.xml');
      expect(renameCall.args[1].includes('/.elasticio_processed/data.xml')).to.equal(true);
    });
  });

  it('File read and create processed folder in a configured directory', () => {
    const msg = {};
    const cfg = {
      directory: '/verylongdirectoryname',
    };

    files = [
      {
        filename: 'data.xml',
        longname: '-rw-r--r--    1 democommercetools ftpcreator       94 Aug 14 08:25 data.xml',
        attrs: {
          size: 10,
        },
      },
    ];

    const xml = '<?xml version=\'1.0\' encoding=\'UTF-8\' ?><root><child/></root>';

    sinon.stub(readFile, 'readFile').callsFake((client2, path, callback) => {
      callback(null, Buffer.from(xml));
    });

    const attachmentProcessor = new AttachmentProcessor();

    sinon.stub(attachmentProcessor, 'getAttachment').callsFake(() => ({
      data: 'stream',
    }));

    runAndExpect(msg, cfg, (err, newMsg, newSnapshot) => {
      expect(err).to.be.undefined;

      const attachment = newMsg.attachments['data.xml'];

      expect(attachment.url).to.equal('http://loremipsum');

      expect(attachmentsStub.callCount > 0).to.equal(true);
      expect(attachmentsStub.getCall(0).args[0]).to.equal(newMsg);
      expect(attachmentsStub.getCall(0).args[1]).to.equal('data.xml');
      // expect(attachmentsStub.getCall(0).args[2]).to.equal(stream);
      expect(attachmentsStub.getCall(0).args[3]).to.equal(10);

      expect(newSnapshot).to.be.undefined;

      expect(connectStub.getCall(0).args[0]).to.equal(cfg);

      expect(opendirStub.getCall(0).args[0]).to.equal('/verylongdirectoryname');

      expect(endStub.callCount > 0).to.equal(true);

      expect(mkdirStub.getCall(0).args[0]).to.equal('/verylongdirectoryname/.elasticio_processed');
      expect(mkdirStub.getCall(0).args[1]).to.deep.equal({
        mode: 16877,
      });

      expect(renameStub.callCount > 0).to.equal(true);

      const renameCall = renameStub.getCall(0);
      expect(renameCall.args[0]).to.equal('/verylongdirectoryname/data.xml');
      expect(renameCall.args[1].includes('/verylongdirectoryname/.elasticio_processed/data.xml')).to.equal(true);
    });
  });
});
