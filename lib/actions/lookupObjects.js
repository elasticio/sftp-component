/* eslint-disable no-underscore-dangle, camelcase, no-param-reassign, no-unused-vars, no-restricted-syntax, object-curly-newline */
const { messages } = require('elasticio-node');
const { LookupObjects } = require('@elastic.io/oih-standard-library/lib/actions/lookupObjects');
const { getLogger } = require('@elastic.io/component-commons-library');
const { FETCH_ALL, FETCH_PAGE, EMIT_INDIVIDUALLY, BEHAVIOUR } = require('@elastic.io/oih-standard-library/lib/constants');
const { uploadFromSftpToAttachmentBuffer, fillOutputBody } = require('../attachments');
const Sftp = require('../Sftp');
const { ConditionResolver, CONDITIONS_LIST, isNumberInInterval, sleep, timeOut } = require('../utils');
const { lookupObjectsFetchPage, lookupObjectsEmitIndividually, lookupObjectsFetchAll } = require('../metadata/outputMetadata');

const { DIR } = require('../constants');
const { getFileContentInBase64 } = require('../utils/sftpUtils');

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
    this.logger.debug('Emitting message');
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
    this.logger.debug('Emitting message');
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
    this.logger.debug('Emitting message');
    return message;
  }

  validateAndSetDefaultCfg(cfg) {
    const isNumberNaN = (num) => Number(num).toString() === 'NaN';
    const invalidNumberError = (message) => new Error(`"${message}" must be valid number`);
    let {
      fileUploadRetry = 5,
      retryTimeout = 10000,
      fileUploadTimeout = 10000,
    } = cfg;
    if (isNumberNaN(fileUploadRetry)) throw invalidNumberError('File Upload Retry');
    if (isNumberNaN(fileUploadTimeout)) throw invalidNumberError('File Upload Timeout');
    if (isNumberNaN(retryTimeout)) throw invalidNumberError('Retry Timeout');
    fileUploadRetry = Number(fileUploadRetry);
    retryTimeout = Number(retryTimeout);
    fileUploadTimeout = Number(fileUploadTimeout);
    return { ...cfg, fileUploadRetry, retryTimeout, fileUploadTimeout };
  }

  async getObjectsByCriteria(objectType, criteria, msg, cfg) {
    const { fileUploadRetry, retryTimeout, fileUploadTimeout } = this.validateAndSetDefaultCfg(cfg);
    const listOfFiles = await this.client.list(msg.body[DIR]);
    if (listOfFiles.length === 0) {
      this.logger.info('Have not found files by provided path');
      return listOfFiles;
    }
    const conditionResolver = new ConditionResolver(this.logger);
    const filteredList = listOfFiles
      .filter((item) => conditionResolver.processConditions(msg.body, item, { dateFields: DATE_FIELDS }))
      .filter(((item) => item.type === '-'));
    this.logger.debug('Applied filter conditions');

    if (cfg.uploadFilesToAttachments === 'No') {
      return filteredList.map((item) => fillOutputBody(item, msg.body[DIR]));
    }
    const uploadResult = [];
    for (const file of filteredList) {
      let fileUploadResult;
      let currentTry = 0;
      do {
        try {
          const token = {};
          fileUploadResult = await Promise.race([
            this.processFileContent(this, cfg.emitFileContent, file, msg.body[DIR], token),
            timeOut(fileUploadTimeout, token),
          ]);
          break;
        } catch (e) {
          currentTry++;
          if (currentTry > fileUploadRetry) throw e;
          this.logger.error(`got error ${e.message}, going to retry (${currentTry} of ${fileUploadRetry}) upload file`);
          if (sftpClient) sftpClient.end();
          await sleep(retryTimeout);
          sftpClient = new Sftp(this.logger, cfg);
          await sftpClient.connect();
          this.client = sftpClient;
        }
      } while (currentTry <= fileUploadRetry);

      const { body, attachments } = fileUploadResult;
      body.attachments = attachments;
      uploadResult.push(body);
    }
    console.log(JSON.stringify(uploadResult, null, 2));
    this.logger.debug('Upload results ready');
    return uploadResult;
  }

  async processFileContent(context, emitFileContent, file, directory, token) {
    if (emitFileContent) {
      context.logger.info('Getting file content as a Base64 string...');
      const base64Content = await getFileContentInBase64(this, file, directory);
      return messages.newMessageWithBody({ ...base64Content.body });
    }
    this.logger.info('Uploading file content to the attachment...');
    const { body, attachments } = await uploadFromSftpToAttachmentBuffer(this, file, directory);
    return { ...messages.newMessageWithBody(body), attachments };
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

async function process(msg, cfg, snapshot = {}) {
  try {
    const numSearchTerms = parseInt(cfg.numSearchTerms || 0, 10);
    if (!isNumberInInterval(numSearchTerms, 0, 99)) {
      throw new Error('Number of search terms must be an integer value from the interval [0-99]');
    }

    if (!sftpClient) {
      sftpClient = new Sftp(this.logger, cfg);
      await sftpClient.connect();
    }
    if (!await sftpClient.exists(msg.body[DIR])) {
      throw new Error(`Directory ${msg.body[DIR]} is not exist`);
    }
    sftpClient.setLogger(this.logger);
    const lookupFilesAction = new LookupFiles(this.logger, this, sftpClient);
    return lookupFilesAction.process(msg, cfg, snapshot);
  } catch (e) {
    this.logger.error('Error during message processing');
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

async function init(cfg) {
  sftpClient = new Sftp(getLogger(), cfg);
  await sftpClient.connect();
}

async function shutdown(cfg, data) {
  await sftpClient.end();
}

module.exports.init = init;
module.exports.shutdown = shutdown;
module.exports.process = process;
module.exports.getMetaModel = getMetaModel;
