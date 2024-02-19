const { messages } = require('elasticio-node');
const path = require('path');
const { LookupObjectById } = require('@elastic.io/oih-standard-library/lib/actions/lookupObject');
const { getFileContentInBase64 } = require('./sftpUtils');
const { uploadFromSftpToAttachmentBuffer } = require('../attachments');

class SftpLookupObject extends LookupObjectById {
  constructor(logger, client) {
    super(logger);
    this.client = client;
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  getId(msg, cfg) {
    return msg.body.path;
  }

  async getFile(dir, filename) {
    this.logger.info('Starting verify if file exists in directory');
    const list = await this.client.list(dir, new RegExp(filename));
    const files = list.filter((file) => file.name === filename && file.type === '-');
    if (files.length !== 1) {
      if (files.length === 0) {
        this.logger.info('File was not found');
      } else {
        this.logger.info('More than one file were found');
      }
      return null;
    }
    const [file] = files;
    this.logger.info('File exists in given directory');
    return file;
  }

  async lookupObject(filePath, cfg) {
    const directory = path.posix.dirname(filePath);
    const filename = path.basename(filePath);
    const { emitFileContent } = cfg;
    const file = await this.getFile(directory, filename);
    if (!file) {
      return null;
    }
    if (emitFileContent) {
      this.logger.info('Getting file content as a Base64 string...');
      const base64Content = await getFileContentInBase64(this, file, directory);
      return messages.newMessageWithBody({ ...base64Content.body, attachment_url: '' });
    }
    this.logger.info('Uploading file content to the attachment...');
    const { body, attachments } = await uploadFromSftpToAttachmentBuffer(this, file, directory);
    return { ...messages.newMessageWithBody(body), attachments };
  }

  async process(msg, cfg) {
    try {
      this.logger.info('Starting processing lookupObjectById action');
      const id = this.getId(msg, cfg);
      if (id === undefined || id === null) {
        this.logger.trace('Filename is empty');
        if (this.isOmittedCriteriaAllowed(cfg, msg)) {
          this.logger.trace('Empty filename allowed, returning empty object');
          this.logger.info('Finished processing lookupObjectById action');
          return messages.newEmptyMessage();
        }
        this.logger.trace('Empty filename is not allowed throwing error');
        throw new Error('Empty filename is not allowed.');
      }
      const result = await this.lookupObject(id, cfg);
      this.logger.debug('Result of lookup received');
      if (result === null) {
        this.logger.debug('Object not found for specified filename');
        if (this.isEmptyResultAllowed(cfg, msg)) {
          this.logger.trace('Empty result allowed, returning empty object');
          this.logger.info('Finished processing lookupObjectById action');
          return messages.newEmptyMessage();
        }
        this.logger.trace('Empty result not allowed, throwing error');
        throw new Error(`Object with path and filename: ${JSON.stringify(id)} not found. Empty result is not allowed.`);
      }
      this.logger.info('Finished processing lookupObjectById action');
      return result;
    } catch (e) {
      this.logger.error('Unexpected error while processing lookupObjectById call');
      throw e;
    }
  }
}

exports.SftpLookupObject = SftpLookupObject;
