require('dotenv').config();
const { getLogger } = require('@elastic.io/component-commons-library');
const sinon = require('sinon');
const { expect } = require('chai');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const lookupFiles = require('../../lib/actions/lookupObjects');
const { DIR } = require('../../lib/constants');
const Sftp = require('../../lib/Sftp');

const context = {
  emit: sinon.spy(),
  logger: getLogger(),
};

let cfg;
let msg;

describe('Lookup Files', () => {
  let connectStub;
  let endStub;
  let listStub;
  let getStub;
  let existsStub;
  let uploadAttachmentStub;
  let resp;
  let responseBody;

  before(async () => {
    cfg = {
      host: process.env.SFTP_HOSTNAME || 'hostname',
      port: Number(process.env.PORT),
      username: process.env.SFTP_USER || 'user',
      password: process.env.SFTP_PASSWORD || 'psw',
      numSearchTerms: 1,
      emitBehaviour: 'emitIndividually',
    };
    connectStub = sinon.stub(Sftp.prototype, 'connect').callsFake();
    endStub = sinon.stub(Sftp.prototype, 'end').callsFake();
    listStub = await sinon.stub(Sftp.prototype, 'list');
    getStub = await sinon.stub(Sftp.prototype, 'get');
    existsStub = await sinon.stub(Sftp.prototype, 'exists');
    uploadAttachmentStub = await sinon.stub(AttachmentProcessor.prototype, 'uploadAttachment');
    await lookupFiles.init(cfg);
  });

  beforeEach(() => {
    msg = {
      body: {
        [DIR]: '/www/nick/test',
        searchTerm0: {
          fieldName: 'name',
          condition: 'like',
          fieldValue: '123*',
        },
      },
    };
    cfg = {
      host: process.env.SFTP_HOSTNAME || 'hostname',
      port: Number(process.env.PORT),
      username: process.env.SFTP_USER || 'user',
      password: process.env.SFTP_PASSWORD || 'psw',
      numSearchTerms: 1,
      emitBehaviour: 'emitIndividually',
    };
    resp = {
      config: {
        url: 'http://localhost/id',
      },
      data: {
        objectId: 'objectId',
      },
    };
    responseBody = [
      {
        type: '-',
        name: '123.json_1558428893007',
        size: 2984,
        modifyTime: 1574930817000,
        accessTime: 1574930817000,
        rights: { user: 'rw', group: 'r', other: '' },
        owner: 1002,
        group: 1002,
      },
      {
        type: '-',
        name: '123.json_1558460387824',
        size: 2984,
        modifyTime: 1558427618000,
        accessTime: 1558459105000,
        rights: { user: 'rw', group: 'rw', other: 'rw' },
        owner: 1002,
        group: 1002,
      },
    ];
  });

  after(async () => {
    await lookupFiles.shutdown(cfg);
    connectStub.restore();
    endStub.restore();
    listStub.restore();
    getStub.restore();
    existsStub.restore();
    uploadAttachmentStub.restore();
  });

  afterEach(() => {
    context.emit.resetHistory();
    listStub.resetHistory();
    getStub.resetHistory();
    existsStub.resetHistory();
    uploadAttachmentStub.resetHistory();
  });

  it('fetchAll', async () => {
    if (listStub) listStub.withArgs(msg.body[DIR]).returns(responseBody);
    if (existsStub) existsStub.withArgs(msg.body[DIR]).returns(true);
    if (getStub) getStub.withArgs('/www/nick/test/123.json_1558428893007').returns(Buffer.from('str', 'utf-8'));
    if (getStub) getStub.withArgs('/www/nick/test/123.json_1558460387824').returns(Buffer.from('str', 'utf-8'));
    if (uploadAttachmentStub) uploadAttachmentStub.withArgs(sinon.match.any).returns(resp);
    cfg.numSearchTerms = 1;
    cfg.emitBehaviour = 'fetchAll';
    await lookupFiles.process.call(context, msg, cfg, {});
    expect(context.emit.getCalls().length).to.be.eql(1);
    expect(context.emit.getCall(0).args[1].body).to.deep.eql({ results: responseBody });
  });

  it('emitIndividually', async () => {
    if (listStub) listStub.withArgs(msg.body[DIR]).returns(responseBody);
    if (existsStub) existsStub.withArgs(msg.body[DIR]).returns(true);
    if (getStub) getStub.withArgs('/www/nick/test/123.json_1558428893007').returns(Buffer.from('str', 'utf-8'));
    if (getStub) getStub.withArgs('/www/nick/test/123.json_1558460387824').returns(Buffer.from('str', 'utf-8'));
    if (uploadAttachmentStub) uploadAttachmentStub.withArgs(sinon.match.any).returns(resp);
    cfg.numSearchTerms = 1;
    cfg.emitBehaviour = 'emitIndividually';
    cfg.uploadFilesToAttachments = 'Yes';
    await lookupFiles.process.call(context, msg, cfg, {});
    expect(context.emit.getCalls().length).to.be.eql(2);
    expect(context.emit.getCall(0).args[1].body).to.deep.eql(responseBody[0]);
    expect(context.emit.getCall(1).args[1].body).to.deep.eql(responseBody[1]);
  });

  it('emitIndividually Only metadata', async () => {
    if (listStub) listStub.withArgs(msg.body[DIR]).returns(responseBody);
    if (existsStub) existsStub.withArgs(msg.body[DIR]).returns(true);
    cfg.numSearchTerms = 1;
    cfg.emitBehaviour = 'emitIndividually';
    cfg.uploadFilesToAttachments = 'No';
    await lookupFiles.process.call(context, msg, cfg, {});
    expect(context.emit.getCalls().length).to.be.eql(2);
    expect(context.emit.getCall(0).args[1].body.attachment_url).to.be.undefined;
    expect(context.emit.getCall(1).args[1].body.attachment_url).to.be.undefined;
  });

  it('dir nor found error', async () => {
    if (existsStub) existsStub.withArgs(msg.body[DIR]).returns(false);
    msg.body[DIR] = '/unknown_dir/test';
    cfg.numSearchTerms = 1;
    cfg.emitBehaviour = 'emitIndividually';
    cfg.uploadFilesToAttachments = 'No';
    await lookupFiles.process.call(context, msg, cfg, {}).catch((e) => {
      expect(e.message).to.be.eql('Directory /unknown_dir/test is not exist');
    });
    expect(context.emit.getCalls().length).to.be.eql(0);
  });

  it('getMetaModel', async () => {
    await lookupFiles.getMetaModel.call(context, cfg);
  });

  it('filter by criterias', async () => {
    await lookupFiles.getMetaModel.call(context, cfg);
  });
});
