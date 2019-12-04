const { PollingTrigger } = require('@elastic.io/oih-standard-library/lib/triggers/getNewAndUpdated');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { Readable } = require('stream');
const { messages } = require('elasticio-node');

const Sftp = require('../Sftp');
const { getDirectory } = require('./utils');

class SftpPolling extends PollingTrigger {
  constructor(logger, context, client, cfg) {
    super(logger, context);
    this.client = client;
    this.cfg = cfg;
  }

  async getObjects(objectType, startTime, endTime, cfg) {
    const formattedStartTime = new Date(startTime);
    const formattedEndTime = new Date(endTime);
    const fileList = await this.client.list(cfg.directory);
    return fileList
      .filter((file) => new Date(file.modifyTime) >= formattedStartTime)
      .filter((file) => new Date(file.modifyTime) < formattedEndTime);
  }

  async emitIndividually(results) {
    this.logger.debug('Start emitting data');
    const attachmentProcessor = new AttachmentProcessor();
    for (let i = 0; i < results.length; i += 1) {
      const r = results[i];
      if (r === null || r === undefined) {
        this.logger.trace('Not emitting result with empty body, result was: %j', r);
      } else {
        // eslint-disable-next-line no-await-in-loop
        const attachmentResult = await this.uploadFileAsAttachment(attachmentProcessor, r);

        const resultMessage = messages.newMessageWithBody(this.prepareMessageDescription(r));

        resultMessage.attachments[r.name] = {
          url: attachmentResult.config.url,
          size: r.size,
        };

        this.logger.trace('Emitting new message with body: %j', resultMessage.body);
        // eslint-disable-next-line no-await-in-loop
        await this.context.emit('data', resultMessage);
      }
    }
    this.logger.debug('Finished emitting data');
  }

  async emitAll(results) {
    this.logger.debug('Start emitting data');
    const attachmentProcessor = new AttachmentProcessor();
    if (results === null || results === undefined || results.length === 0) {
      this.logger.trace('Not emitting result with empty body, results was: %j', results);
      return;
    }

    const resultMessage = messages.newMessageWithBody({ results: [] });
    for (let i = 0; i < results.length; i += 1) {
      const r = results[i];
      // eslint-disable-next-line no-await-in-loop
      const attachmentResult = await this.uploadFileAsAttachment(attachmentProcessor, r);
      resultMessage.attachments[r.name] = {
        url: attachmentResult.config.url,
        size: r.size,
      };

      resultMessage.body.results.push(this.prepareMessageDescription(r));
    }

    this.logger.trace('Emitting new message with body: %j', resultMessage.body);
    await this.context.emit('data', resultMessage);
    this.logger.debug('Finished emitting data');
  }

  // eslint-disable-next-line class-methods-use-this
  prepareMessageDescription(file) {
    const dir = getDirectory(this.cfg);
    return {
      type: file.type,
      filename: file.name,
      size: file.size,
      modifyTime: new Date(file.modifyTime).toISOString(),
      accessTime: new Date(file.accessTime).toISOString(),
      directory: dir,
      path: `${dir}/${file.name}`,
    };
  }

  async uploadFileAsAttachment(attachmentProcessor, file) {
    const path = Sftp.createPath(this.cfg.directory, file.name);

    const buffer = await this.client.get(path);
    const readStream = new Readable();
    readStream.push(buffer);
    readStream.push(null);
    return attachmentProcessor.uploadAttachment(readStream);
  }
}

exports.SftpPolling = SftpPolling;
