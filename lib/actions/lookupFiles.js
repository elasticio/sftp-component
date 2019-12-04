/* eslint-disable no-underscore-dangle, camelcase, no-param-reassign */
const { messages } = require('elasticio-node');
const componentLogger = require('@elastic.io/component-logger')();
const { LookupObjects } = require('@elastic.io/oih-standard-library/lib/actions/lookupObjects');
const {
  FETCH_ALL,
  FETCH_PAGE,
  EMIT_INDIVIDUALLY,
  BEHAVIOUR,
} = require('@elastic.io/oih-standard-library/lib/constants');
// } = require('../../../oih-standard-library/lib/constants');

// const { LookupObjects } = require('../../../oih-standard-library/lib/actions/lookupObjects');

const { uploadFromSftpToAttachment } = require('../attachments');
const Sftp = require('../Sftp');
const { unixTimeToIsoDate } = require('../utils');
const { ConditionResolver, CONDITIONS_LIST } = require('../utils/conditionResolver');
const { lookupObjectsFetchPage, lookupObjectsEmitIndividually, lookupObjectsFetchAll } = require('../metadata/outputMetadata');

const { DIR } = require('../constants');


const DATE_FIELDS = ['modifyTime', 'accessTime'];


let sftpClient;

class LookupFiles extends LookupObjects {
  constructor(logger, context, client) {
    super(logger, context);
    this.client = client;
  }

  wrapToMessageEmitIndividually(body) {
    const message = messages.newEmptyMessage();
    if (body.attachments) {
      message.attachments = body.attachments;
      delete body.attachments;
    }
    message.body = body;
    this.logger.trace('Emitting message: %j', message);
    return message;
  }

  wrapToMessageFetchAll(body) {
    const message = messages.newEmptyMessage();
    body.results.forEach((field) => {
      if (field.attachments) {
        Object.assign(message.attachments, body.attachments);
        delete field.attachments;
      }
    });
    message.body = body;
    this.logger.trace('Emitting message: %j', message);
    return message;
  }

  wrapToMessageFetchPage(body) {
    const message = messages.newEmptyMessage();
    body.results.forEach((field) => {
      if (field.attachments) {
        Object.assign(message.attachments, body.attachments);
        delete field.attachments;
      }
    });
    message.body = body;
    this.logger.trace('Emitting message: %j', message);
    return message;
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

      const uploadResult = await uploadFromSftpToAttachment(this.logger, file, sftpClient, msg.body[DIR]);
      return uploadResult;
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
    switch (cfg[BEHAVIOUR]) {
      case EMIT_INDIVIDUALLY:
        metaModel.out = lookupObjectsEmitIndividually;
        break;
      case FETCH_PAGE:
        metaModel.out = lookupObjectsFetchPage;
        break;
      case FETCH_ALL:
        metaModel.out = lookupObjectsFetchAll;
        break;
      default: metaModel.out = {};
    }
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
