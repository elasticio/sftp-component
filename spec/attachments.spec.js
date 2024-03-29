const { expect } = require('chai');
const sinon = require('sinon');
const Stream = require('stream');
const { AttachmentProcessor, getLogger } = require('@elastic.io/component-commons-library');
const attachments = require('../lib/attachments');

const maesterUrl = process.env.ELASTICIO_OBJECT_STORAGE_URI || '';

// stub things
const self = { emit: sinon.spy(), logger: getLogger() };

// parameters
const msg = { attachments: {} };
const name = 'file';
const getStream = async () => new Stream();
const contentLength = 10;

describe('Attachment tests', () => {
  let uploadAttachment;
  before(() => {
  });
  afterEach(() => {
    self.emit.resetHistory();
  });
  after(() => {
    uploadAttachment.restore();
  });

  it('Adds an attachment correctly and returns the correct message', async () => {
    uploadAttachment = sinon.stub(AttachmentProcessor.prototype, 'uploadAttachment').resolves('objectId');
    await attachments.addAttachment.call(self, msg, name, getStream, contentLength);
    expect(uploadAttachment.calledOnceWithExactly(getStream)).to.be.equal(true);
    expect(msg).to.be.deep.equal({
      attachments: {
        file: {
          url: `${maesterUrl}/objects/objectId?storage_type=maester`,
          size: 10,
        },
      },
    });
    uploadAttachment.restore();
  });

  it('Throws an error if attachment file is too large', async () => {
    const file = {
      type: '-',
      name: '1.txt',
      size: 70000000000,
      accessTime: '1575379317000',
      modifyTime: '1575291942000',
    };
    await attachments.addAttachment.call(self, msg, file.name, getStream, file.size);
    expect(self.emit.getCall(0).args[1].message).to.be.equal('File size is 70000000000 bytes, it violates the variable MAX_FILE_SIZE, which is currently set to 104857600 bytes');
  });

  it('Emits an error upon failure', async () => {
    uploadAttachment = sinon.stub(AttachmentProcessor.prototype, 'uploadAttachment').throws(new Error('This input should be rejected'));

    await attachments.addAttachment.call(self, msg, name, 'not a stream', contentLength)
      .catch((e) => {
        expect(e.message).to.be.equal('This input should be rejected');
        expect(uploadAttachment.getCall(0).args[0]).to.be.equal('not a stream');
        expect(uploadAttachment.getCall(0).args[1]).to.be.equal('stream');
        uploadAttachment.restore();
      });
  });
});
