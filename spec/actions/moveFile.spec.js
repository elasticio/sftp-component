require('dotenv').config();
const logger = require('@elastic.io/component-commons-library/lib/logger/logger').getLogger();
const sinon = require('sinon');
const { expect } = require('chai');
const moveFile = require('../../lib/actions/moveFile');
const Sftp = require('../../lib/Sftp');

const context = {
  emit: sinon.spy(),
  logger,
};

let cfg;
let msg;

describe('Lookup Files', () => {
  let connectStub;
  let endStub;
  let renameStub;
  let responseBody;

  before(async () => {
    cfg = {
      host: process.env.SFTP_HOSTNAME || 'hostname',
      port: Number(process.env.PORT),
      username: process.env.SFTP_USER || 'user',
      password: process.env.SFTP_PASSWORD || 'psw',
    };
    connectStub = sinon.stub(Sftp.prototype, 'connect').callsFake();
    endStub = sinon.stub(Sftp.prototype, 'end').callsFake();
    renameStub = await sinon.stub(Sftp.prototype, 'move');
  });

  beforeEach(() => {
    msg = {
      body: {
        filename: '/some/file.txt',
        newFilename: '/some/new/file.txt',
      },
    };

    cfg = {
      host: process.env.SFTP_HOSTNAME || 'hostname',
      port: Number(process.env.PORT),
      username: process.env.SFTP_USER || 'user',
      password: process.env.SFTP_PASSWORD || 'psw',
    };

    responseBody = {
      type: '-',
      name: '/some/new/file.txt',
      size: 2984,
      modifyTime: 1558427618000,
      accessTime: 1558459105000,
      rights: { user: 'rw', group: 'rw', other: 'rw' },
      owner: 1002,
      group: 1002,
    };
  });

  after(async () => {
    connectStub.restore();
    endStub.restore();
    renameStub.restore();
  });

  afterEach(() => {
    context.emit.resetHistory();
    renameStub.resetHistory();
  });

  it('emitIndividually', async () => {
    if (renameStub) renameStub.withArgs(msg.body.filename, msg.body.newFilename).returns(responseBody);
    await moveFile.process.call(context, msg, cfg);
    expect(context.emit.getCalls().length).to.be.eql(1);
    expect(context.emit.getCall(0).args[1].body).to.deep.eql(msg.body);
  });
});
