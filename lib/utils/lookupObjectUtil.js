const { messages } = require('elasticio-node');
const { Readable } = require('stream');
const { LookupObjectById } = require('@elastic.io/oih-standard-library/lib/actions/lookupObject');
const attachments = require('../attachments');

const MAX_FILE_SIZE = 104857600; // 100 MiB

class SftpLookupObject extends LookupObjectById {
  constructor(logger, client) {
    super(logger);
    this.client = client;
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  getId(msg, cfg) {
    return msg.body.filename;
  }

  async lookupObject(filename, cfg) {
    const { directory } = cfg;
    const dir = directory.substring(directory.length - 1) === '/'
      ? directory.substring(0, directory.length - 1)
      : directory;
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
    const { size } = file;
    if (size > MAX_FILE_SIZE) {
      throw new Error(`File with filename: ${filename} has size = ${size} MiB and can not be processed.`);
    }
    this.logger.info(`File with name: ${filename} is exists in directory ${dir}`);
    const filePath = `${dir}/${filename}`;
    this.logger.info(`Reading ${filePath} into read stream`);
    const buffer = await this.client.get(filePath);
    const readStream = new Readable();
    readStream.push(buffer);
    readStream.push(null);
    const result = messages.newMessageWithBody({
      filename,
      size,
    });
    this.logger.info('Starting add attachment to result');
    await attachments.addAttachment.call(this, result, filename, readStream, size);
    this.logger.info('Attachment successfully added to message');
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
