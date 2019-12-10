/* eslint-disable no-underscore-dangle, camelcase, no-param-reassign */
const { messages } = require('elasticio-node');
const componentLogger = require('@elastic.io/component-commons-library/lib/logger/logger').getLogger();
const { LookupObjects } = require('@elastic.io/oih-standard-library/lib/actions/lookupObjects');
const {
  FETCH_ALL,
  FETCH_PAGE,
  EMIT_INDIVIDUALLY,
  BEHAVIOUR,
} = require('@elastic.io/oih-standard-library/lib/constants');

const { uploadFromSftpToAttachment, fillOutputBody } = require('../attachments');
const Sftp = require('../Sftp');
const { ConditionResolver, CONDITIONS_LIST, isNumberInInterval } = require('../utils');
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
        Object.assign(message.attachments, JSON.parse(JSON.stringify(field.attachments)));
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
    const filteredList = listOfFiles
      .filter((item) => conditionResolver.processConditions(msg.body, item, { dateFields: DATE_FIELDS }))
      .filter(((item) => item.type === '-'));
    this.logger.trace('Applied conditions... Founded files: %j', filteredList);

    if (cfg.uploadFilesToAttachments === 'No') {
      return filteredList.map((item) => fillOutputBody(item, msg.body[DIR]));
    }
    const uploadPromises = filteredList.map(async (file) => {
      const { body, attachments } = await uploadFromSftpToAttachment(this, file, msg.body[DIR]);
      body.attachments = attachments;
      return body;
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
      default:
        metaModel.out = {};
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
  try {
    const numSearchTerms = parseInt(cfg.numSearchTerms || 0, 10);
    if (!isNumberInInterval(numSearchTerms, 0, 99)) {
      throw new Error('Number of search terms must be an integer value from the interval [0-99]');
    }
    if (!await sftpClient.exists(msg.body[DIR])) {
      throw new Error(`Directory ${msg.body[DIR]} is not exist`);
    }
    const lookupFilesAction = new LookupFiles(this.logger, this, sftpClient);
    return lookupFilesAction.process(msg, cfg, snapshot);
  } catch (e) {
    this.logger.error('Error during message processing', e);
    throw e;
  }
}

async function getMetaModel(cfg) {
  const numSearchTerms = parseInt(cfg.numSearchTerms || 0, 10);
  if (!isNumberInInterval(numSearchTerms, 0, 99)) {
    throw new Error('Number of search terms must be an integer value from the interval [0-99]');
  }
  const lookupFilesAction = new LookupFiles(this.logger, this);
  return lookupFilesAction.getMetaModel(cfg);
}

module.exports.init = init;
module.exports.shutdown = shutdown;
module.exports.process = process;
module.exports.getMetaModel = getMetaModel;
