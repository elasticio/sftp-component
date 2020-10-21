const sinon = require('sinon');
const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
const { AttachmentProcessor, Logger } = require('@elastic.io/component-commons-library');

chai.use(chaiAsPromised);
const { expect } = require('chai');
const Sftp = require('../../lib/Sftp');
const trigger = require('../../lib/triggers/read');

const logger = Logger.getLogger();

describe('SFTP test - read trigger', () => {
  const self = {
    emit: sinon.spy(),
    logger,
  };
  const buffer = Buffer.from('Hello');
  const res = { config: { url: 'https://url' } };
  const cfg = {
    directory: 'www/test',
  };

  it('Failed to connect', async () => {
    const sftpClientConnectStub = sinon.stub(Sftp.prototype, 'connect').throws(new Error('Connection failed'));

    await expect(trigger.process.call(self, {}, cfg)).be.rejectedWith('Connection failed');
    expect(sftpClientConnectStub.calledOnce).to.be.equal(true);
    sftpClientConnectStub.restore();
  });

  it('No such directory', async () => {
    const sftpClientConnectStub = sinon.stub(Sftp.prototype, 'connect').returns({});
    const sftpClientListStub = sinon.stub(Sftp.prototype, 'list').throws(new Error('No such directory'));

    await expect(trigger.process.call(self, {}, cfg)).be.rejectedWith('No such directory');

    expect(sftpClientConnectStub.calledOnce).to.be.equal(true);
    expect(sftpClientListStub.calledOnce).to.be.equal(true);
    sftpClientConnectStub.restore();
    sftpClientListStub.restore();
  });

  it('Invalid file pattern causes exception', async () => {
    const sftpClientConnectStub = sinon.stub(Sftp.prototype, 'connect').returns({});
    await expect(trigger.process.call(self, {}, { ...cfg, pattern: '***' })).be.rejectedWith('Invalid regular expression: /***/: Nothing to repeat');

    expect(sftpClientConnectStub.calledOnce).to.be.equal(true);
    sftpClientConnectStub.restore();
  });

  it('No files available', async () => {
    const list = [
      {
        type: 'd',
        name: '.elasticio_processed',
        size: 4096,
      },
    ];
    const sftpClientConnectStub = sinon.stub(Sftp.prototype, 'connect').returns({});
    const sftpClientListStub = sinon.stub(Sftp.prototype, 'list').returns(list);
    const sftpClientEndStub = sinon.stub(Sftp.prototype, 'end').returns(true);

    await trigger.process.call(self, {}, cfg);

    expect(self.emit.called).to.be.equal(false);
    expect(sftpClientEndStub.calledOnce).to.be.equal(true);
    expect(sftpClientListStub.calledOnce).to.be.equal(true);
    expect(sftpClientConnectStub.calledOnce).to.be.equal(true);
    sftpClientConnectStub.restore();
    sftpClientListStub.restore();
    sftpClientEndStub.restore();
  });

  it('File name does not match given pattern', async () => {
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
    const sftpClientConnectStub = sinon.stub(Sftp.prototype, 'connect').returns({});
    const sftpClientListStub = sinon.stub(Sftp.prototype, 'list').returns(list);
    const sftpClientEndStub = sinon.stub(Sftp.prototype, 'end').returns(true);

    await trigger.process.call(self, {}, { ...cfg, pattern: 'aaa' });

    expect(self.emit.called).to.be.equal(false);
    expect(sftpClientConnectStub.calledOnce).to.be.equal(true);
    sftpClientEndStub.restore();
    sftpClientConnectStub.restore();
    sftpClientListStub.restore();
  });

  it('File exceeds maximal file size', async () => {
    const list = [
      {
        type: 'd',
        name: '.elasticio_processed',
        size: 4096,
      },
      {
        type: '-',
        name: '1.txt',
        size: 204857600,
        accessTime: '1575379317000',
        modifyTime: '1575291942000',
      },
    ];
    const sftpClientConnectStub = sinon.stub(Sftp.prototype, 'connect').returns({});
    const sftpClientEndStub = sinon.stub(Sftp.prototype, 'end').returns(true);
    const sftpClientListStub = sinon.stub(Sftp.prototype, 'list').returns(list);

    await trigger.process.call(self, {}, cfg);

    expect(self.emit.called).to.be.equal(false);
    expect(sftpClientConnectStub.calledOnce).to.be.equal(true);
    expect(sftpClientEndStub.calledOnce).to.be.equal(true);
    expect(sftpClientListStub.calledOnce).to.be.equal(true);
    sftpClientEndStub.restore();
    sftpClientConnectStub.restore();
    sftpClientListStub.restore();
  });

  it('File read successfully', async () => {
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
    const sftpClientConnectStub = sinon.stub(Sftp.prototype, 'connect').returns({});
    const sftpClientExistsStub = sinon.stub(Sftp.prototype, 'exists').returns(true);
    const sftpClientMoveStub = sinon.stub(Sftp.prototype, 'move').returns(true);
    const sftpClientEndStub = sinon.stub(Sftp.prototype, 'end').returns(true);
    const sftpClientListStub = sinon.stub(Sftp.prototype, 'list').returns(list);
    const sftpClientGetStub = sinon.stub(Sftp.prototype, 'get').returns(buffer);
    const attachStub = sinon.stub(AttachmentProcessor.prototype, 'uploadAttachment').returns(res);

    await trigger.process.call(self, {}, cfg);

    expect(self.emit.calledOnce).to.be.equal(true);
    expect(self.emit.getCall(0).args[0]).to.be.equal('data');
    expect(self.emit.getCall(0).args[1].body).to.be.deep.equal({
      filename: '1.txt',
      size: 7,
    });
    expect(sftpClientConnectStub.calledOnce).to.be.equal(true);
    expect(attachStub.calledOnce).to.be.equal(true);
    sftpClientEndStub.restore();
    sftpClientMoveStub.restore();
    sftpClientExistsStub.restore();
    sftpClientConnectStub.restore();
    sftpClientListStub.restore();
    sftpClientGetStub.restore();
    attachStub.restore();
  });
});
