const { messages } = require('elasticio-node');
const { Readable } = require('stream');
const { LookupObjectById } = require('@elastic.io/oih-standard-library/lib/actions/lookupObject');
const attachments = require('../attachments');
const { getDirectory } = require('./utils');

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

  async addAttachment(dir, result, filename, size) {
    const filePath = `${dir}/${filename}`;
    this.logger.info(`Reading ${filePath} into read stream`);
    const buffer = await this.client.get(filePath);
    const readStream = new Readable();
    readStream.push(buffer);
    readStream.push(null);
    this.logger.info('Starting add attachment to result');
    await attachments.addAttachment.call(this, result, filename, readStream, size);
    this.logger.info('Attachment successfully added to message');
  }

  async lookupObject(filename, cfg) {
    const directory = await getDirectory(cfg);
    const file = await this.getFile(directory, filename);
    if (!file){
      return null;
    }
    const result = messages.newMessageWithBody(file);
    await this.addAttachment(directory, result, filename, file.size);
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
