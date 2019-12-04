/* eslint-disable no-underscore-dangle, camelcase, no-param-reassign */

const componentLogger = require('@elastic.io/component-logger')();
const { Transform } = require('stream');
const path = require('path');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { LookupObjects } = require('@elastic.io/oih-standard-library/lib/actions/lookupObjects');
// const { LookupObjects } = require('../../../oih-standard-library/lib/actions/lookupObjects');
const { DIR } = require('../constants');
const { unixTimeToIsoDate } = require('../utils');
const { ConditionResolver } = require('../utils/conditionResolver');
const Sftp = require('../Sftp');
const { CONDITIONS_LIST } = require('../utils/conditionResolver');

const DATE_FIELDS = ['modifyTime', 'accessTime'];


let sftpClient;

class LookupFiles extends LookupObjects {
  constructor(logger, context, client) {
    super(logger, context);
    this.client = client;
  }

  // eslint-disable-next-line no-unused-vars,max-len
  async getObjectsByCriteria(objectType, criteria, msg, cfg) {
    const listOfFiles = await this.client.list(msg.body[DIR]);
    if (listOfFiles.length === 0) {
      this.logger.info('Have not found files by path: %s', msg.body[DIR]);
      return listOfFiles;
    }
    const conditionResolver = new ConditionResolver(this.logger);
    const filteredList = listOfFiles.filter((item) => conditionResolver.processConditions(msg.body, item, { dateFields: DATE_FIELDS }));
    this.logger.trace('Applied conditions... Founded files: %j', filteredList);


    const uploadPromises = filteredList.map(async (file) => {
      DATE_FIELDS.forEach((fileProperty) => {
        if (file[fileProperty]) {
          file[fileProperty] = unixTimeToIsoDate(file[fileProperty]);
        }
      });

      const transform = new Transform({
        writableObjectMode: true,
        readableObjectMode: true,
        transform: (chunk, _, cb) => {
          cb(null, chunk);
        },
      });

      const filePath = path.join(msg.body[DIR], file.name);
      this.logger.info('About to start saving file: %s', filePath);
      await sftpClient.get(filePath, transform);

      const attachmentProcessor = new AttachmentProcessor();
      const attachment = await attachmentProcessor.uploadAttachment(transform);

      const attachment_url = `${attachment.request.res.req.agent.protocol}//${attachment.request.res.connection._host}${attachment.request.path}`;
      this.logger.info('File %s successfully uploaded to URL: %s', filePath, attachment_url);
      return Object.assign(file, { attachment_url });
    });
    const uploadResult = await Promise.all(uploadPromises);
    this.logger.trace('Files upload results: %j', uploadResult);
    return uploadResult;
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
