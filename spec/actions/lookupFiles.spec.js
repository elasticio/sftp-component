require('dotenv').config();
const logger = require('@elastic.io/component-logger')();
const sinon = require('sinon');
const { expect } = require('chai');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const lookupFiles = require('../../lib/actions/lookupFiles');
const { DIR } = require('../../lib/constants');
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
  let listStub;
  let getStub;
  let uploadAttachmentStub;
  let resp;
  const responseBody = [
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

  before(async () => {
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
      request: {
        res: {
          connection: {
            _host: 'localhost',
          },
          req: {
            agent: {
              protocol: 'http:',
            },
          },
        },
        path: '/id',
      },

    };

    connectStub = sinon.stub(Sftp.prototype, 'connect').callsFake();
    endStub = sinon.stub(Sftp.prototype, 'end').callsFake();
    listStub = await sinon.stub(Sftp.prototype, 'list');
    getStub = await sinon.stub(Sftp.prototype, 'get');
    uploadAttachmentStub = await sinon.stub(AttachmentProcessor.prototype, 'uploadAttachment');
    await lookupFiles.init(cfg);
  });

  after(async () => {
    await lookupFiles.shutdown(cfg);
    connectStub.restore();
    endStub.restore();
    listStub.restore();
    getStub.restore();
    uploadAttachmentStub.restore();
  });

  afterEach(() => {
    context.emit.resetHistory();
    listStub.resetHistory();
    getStub.resetHistory();
    uploadAttachmentStub.resetHistory();
  });

  it('fetchAll', async () => {
    if (listStub) listStub.withArgs(msg.body[DIR]).returns(responseBody);
    if (getStub) getStub.withArgs('/www/nick/test/123.json_1558428893007').returns({});
    if (getStub) getStub.withArgs('/www/nick/test/123.json_1558460387824').returns({});
    if (uploadAttachmentStub) uploadAttachmentStub.withArgs(sinon.match.any).returns(resp);
    cfg.numSearchTerms = 1;
    cfg.emitBehaviour = 'fetchAll';
    await lookupFiles.process.call(context, msg, cfg, {});
    expect(context.emit.getCalls().length).to.be.eql(1);
    expect(context.emit.getCall(0).args[1].body).to.deep.eql({ results: responseBody });
  });

  it('emitIndividually', async () => {
    if (listStub) listStub.withArgs(msg.body[DIR]).returns(responseBody);
    if (getStub) getStub.withArgs('/www/nick/test/123.json_1558428893007').returns({});
    if (getStub) getStub.withArgs('/www/nick/test/123.json_1558460387824').returns({});
    if (uploadAttachmentStub) uploadAttachmentStub.withArgs(sinon.match.any).returns(resp);
    cfg.numSearchTerms = 1;
    cfg.emitBehaviour = 'emitIndividually';
    await lookupFiles.process.call(context, msg, cfg, {});
    expect(context.emit.getCalls().length).to.be.eql(2);
    expect(context.emit.getCall(0).args[1].body).to.deep.eql(responseBody[0]);
    expect(context.emit.getCall(1).args[1].body).to.deep.eql(responseBody[1]);
  });

  it('getMetaModel', async () => {
    await lookupFiles.getMetaModel.call(context, cfg);
  });

  it('filter by criterias', async () => {
    await lookupFiles.getMetaModel.call(context, cfg);
  });
});