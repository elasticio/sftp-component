const componentLogger = require('@elastic.io/component-logger')();
const { Writable } = require('stream');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
// const { LookupObjects } = require('@elastic.io/oih-standard-library/lib/actions/lookupObjects');
const { LookupObjects } = require('../../../oih-standard-library/lib/actions/lookupObjects');
const { DIR } = require('../constants');
const { processConditions } = require('../utils/conditionResolver');
const Sftp = require('../Sftp');
const { CONDITIONS_LIST } = require('../utils/conditionResolver');


let sftpClient;

class LookupFiles extends LookupObjects {
  constructor(logger, context, client) {
    super(logger, context);
    this.client = client;
  }

  // eslint-disable-next-line no-unused-vars,max-len
  async getObjectsByCriteria(objectType, criteria, msg, cfg) {
    const listOfFiles = this.client.list(msg.body[DIR]);
    if (listOfFiles.length === 0) {
      this.logger.info('Have not found files by path: %s', msg.body[DIR]);
      return listOfFiles;
    }
    const filteredList = listOfFiles.filter((item) => processConditions(msg, item));
    this.logger.trace('Applied conditions... Founded files: %j', filteredList);
    const uploadPromises = filteredList.map(async (file) => {
      const filePath = `${msg.body[DIR]}/${file.name}`;
      this.logger.info('About to start saving file: %s', filePath);
      const writeStream = new Writable();
      await sftpClient.get(filePath, writeStream);
      const attachment = await new AttachmentProcessor().uploadAttachment(writeStream);
      this.logger.info('File uploaded to attachments: %s', filePath);
      this.logger.trace('File uploaded to attachments: %s', attachment);
    });
    await Promise.all(uploadPromises);
    return filteredList;
  }

  getInMetadata(cfg) {
    const prop = {
      fields: [
        'name',
        'modifyTime',
        'accessTime',
        'size',
      ],
      conditions: CONDITIONS_LIST,
      additionalFields: {
        [DIR]: {
          type: 'string',
          title: 'Directory Path',
          required: true,
        },
      },
    };
    return super.getInMetadata(cfg, prop);
  }

  getObjectType() {
    return 'file';
  }

  getMetaModel(cfg) {
    const metaModel = {};
    metaModel.in = this.getInMetadata(cfg);
    metaModel.out = {
      type: 'object',
      properties: {},
    };
    return metaModel;
  }
}

async function init(cfg) {
  sftpClient = new Sftp(componentLogger, cfg);
  await sftpClient.connect();
}

// eslint-disable-next-line no-unused-vars
async function shutdown(cfg, data) {
  await sftpClient.end();
}

async function process(msg, cfg, snapshot = {}) {
  const lookupFilesAction = new LookupFiles(this.logger, this, sftpClient);
  return lookupFilesAction.process(msg, cfg, snapshot);
}

async function getMetaModel(cfg) {
  const lookupFilesAction = new LookupFiles(this.logger, this);
  return lookupFilesAction.getMetaModel(cfg);
}

module.exports.init = init;
module.exports.shutdown = shutdown;
module.exports.process = process;
module.exports.getMetaModel = getMetaModel;
