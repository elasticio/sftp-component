const { expect } = require('chai');
const sinon = require('sinon');
const bunyan = require('bunyan');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const Sftp = require('../../lib/Sftp');
const { SftpLookupObject } = require('../../lib/utils/lookupObjectUtil');

const logger = bunyan.createLogger({ name: 'dummy' });

describe('SFTP test - lookup file by file name', () => {
  const buffer = Buffer.from('Hello');
  const res = { config: { url: 'https://url' } };
  const cfg = {
    directory: 'www/test',
  };
  const sftpClient = new Sftp(logger, cfg);
  const lookupObjectAction = new SftpLookupObject(logger, sftpClient);
  it('Lookup file by name process successful', async () => {
    const msg = {
      body: {
        path: 'www/olhav/1.txt',
      },
    };
    const list = [
      {
        type: 'd',
        name: '.elasticio_processed',
        size: 4096,
      },
      {
        type: '-',
        name: '1.txt',
        size: 7,
        accessTime: '1575379317000',
        modifyTime: '1575291942000',
      },
    ];
    const sftpClientListStub = sinon.stub(Sftp.prototype, 'list').returns(list);
    const sftpClientGetStub = sinon.stub(Sftp.prototype, 'get').returns(buffer);
    const attachStub = sinon.stub(AttachmentProcessor.prototype, 'uploadAttachment').returns(res);

    const expectedAttachments = {
      '1.txt': {
        size: 7,
        url: 'https://url',
      },
    };
    const expectedBody = {
      type: '-',
      name: '1.txt',
      size: 7,
      attachment_url: 'https://url',
      accessTime: '2019-12-03T13:21:57.000Z',
      modifyTime: '2019-12-02T13:05:42.000Z',
      directory: 'www/olhav',
      path: 'www/olhav/1.txt',
    };

    const result = await lookupObjectAction.process(msg, cfg, {});

    expect(result.body).to.deep.equal(expectedBody);
    expect(result.attachments).to.deep.equal(expectedAttachments);
    expect(sftpClientListStub.calledOnce).to.be.equal(true);
    expect(sftpClientGetStub.calledOnce).to.be.equal(true);
    expect(attachStub.calledOnce).to.be.equal(true);
    sftpClientListStub.restore();
    sftpClientGetStub.restore();
    attachStub.restore();
  });

  it('lookupObject Action getFile', async () => {
    const dir = 'www/test';
    const filename = '1.txt';
    const list = [
      {
        type: 'd',
        name: '.elasticio_processed',
        size: 4096,
      },
      {
        type: '-',
        name: '1.txt',
        size: 7,
      },
    ];
    const sftpClientListStub = sinon.stub(Sftp.prototype, 'list');
    sftpClientListStub.withArgs(dir, new RegExp(filename)).returns(list);
    sftpClientListStub.withArgs(dir, new RegExp('nonexists')).returns([]);
    const result = await lookupObjectAction.getFile(dir, filename);
    expect(result).to.deep.equal({
      type: '-',
      name: '1.txt',
      size: 7,
    });
    const result2 = await lookupObjectAction.getFile(dir, 'nonexists');
    expect(result2).to.equal(null);
    sftpClientListStub.restore();
  });

  it('Rejects a file that is too large', async () => {
    const msg = {
      body: {
        path: 'www/olhav/1.txt',
      },
    };
    const list = [
      {
        type: 'd',
        name: '.elasticio_processed',
        size: 4096,
      },
      {
        type: '-',
        name: '1.txt',
        size: 70000000000,
        accessTime: '1575379317000',
        modifyTime: '1575291942000',
      },
    ];

    const sftpClientListStub = sinon.stub(Sftp.prototype, 'list').returns(list);

    try {
      await lookupObjectAction.process(msg, cfg, {});
    } catch (e) {
      expect(e.message).to.be.equal(`File is ${list[1].size} bytes, and is too large to upload as an attachment. Max attachment size is 104857600 bytes`);
    }
    sftpClientListStub.restore();
  });
});
