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
        filename: '1.txt',
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
});
