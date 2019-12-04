const { messages } = require('elasticio-node');
const path = require('path');
const { LookupObjectById } = require('@elastic.io/oih-standard-library/lib/actions/lookupObject');
const attachments = require('../attachments');

class SftpLookupObject extends LookupObjectById {
  constructor(logger, client) {
    super(logger);
    this.client = client;
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  getId(msg, cfg) {
    return msg.body.filename;
  }

  async getFile(dir, filename) {
    this.logger.info(`Starting verify is file with name: ${filename} is exists in directory ${dir}`);
    const list = await this.client.list(dir, new RegExp(filename));
    const files = list.filter((file) => file.name === filename && file.type === '-');
    if (files.length !== 1) {
      if (files.length === 0) {
        this.logger.info(`File with name ${filename} was not found`);
      } else {
        this.logger.info('More than one file were found');
      }
      return null;
    }
    const [file] = files;
    this.logger.trace(`File with name: ${filename}: ${JSON.stringify(file)}`);
    this.logger.info(`File with name: ${filename} is exists in directory ${dir}`);
    return file;
  }

  async lookupObject(filePath) {
    const directory = path.posix.dirname(filePath);
    const filename = path.basename(filePath);
    const file = await this.getFile(directory, filename);
    if (!file) {
      return null;
    }
    const uploadResult = await attachments.uploadFromSftpToAttachment(this, file, directory);
    const result = messages.newMessageWithBody(uploadResult.body);
    result.attachments = uploadResult.attachments;
    return result;
  }

  async process(msg, cfg, snapshot) {
    try {
      this.logger.info('Starting processing lookupObjectById action');
      this.logger.trace('Incoming configuration: %j', cfg);
      this.logger.trace('Incoming message: %j', msg);
      this.logger.trace('Incoming snapshot: %j', snapshot);
      const id = this.getId(msg, cfg);
      if (id === undefined || id === null) {
        this.logger.trace('filename is empty');
        if (this.isOmittedCriteriaAllowed(cfg, msg)) {
          this.logger.trace('Empty filename allowed, returning empty object');
          this.logger.info('Finished processing lookupObjectById action');
          return messages.newEmptyMessage();
        }
        this.logger.trace('Empty filename is not allowed throwing error');
        throw new Error('Empty filename is not allowed.');
      }
      const result = await this.lookupObject(id, cfg);
      this.logger.trace('Result of lookup: %j', result);
      if (result === null) {
        this.logger.trace('Object not found for filename: %j', id);
        if (this.isEmptyResultAllowed(cfg, msg)) {
          this.logger.trace('Empty result allowed, returning empty object');
          this.logger.info('Finished processing lookupObjectById action');
          return messages.newEmptyMessage();
        }
        this.logger.trace('Empty result not allowed, throwing error');
        throw new Error(`Object with filename: ${JSON.stringify(id)} not found. Empty result is not allowed.`);
      }
      this.logger.info('Finished processing lookupObjectById action');
      return result;
    } catch (e) {
      this.logger.error('Unexpected error while processing lookupObjectById call for message: %j, cfg: %j', msg, cfg, e);
      throw e;
    }
  }
}

exports.SftpLookupObject = SftpLookupObject;
