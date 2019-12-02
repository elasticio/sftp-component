const { PollingTrigger } = require('@elastic.io/oih-standard-library/lib/triggers/getNewAndUpdated');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { Readable } = require('stream');
const { messages } = require('elasticio-node');

const Sftp = require('../Sftp');

class SftpPolling extends PollingTrigger {
  constructor(logger, client) {
    super(logger);
    this.client = client;
  }

  async getObjects(objectType, startTime, endTime, cfg) {
    this.cfg = cfg;
    const fileList = await this.client.list(cfg.directory);
    const resultList = fileList.filter((file) => new Date(file.modifyTime) >= startTime);
    if (endTime) {
      return resultList.filter((file) => new Date(file.modifyTime) < endTime);
    }
    return resultList;
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
    return {
      type: file.type,
      name: file.name,
      size: file.size,
      modifyTime: file.modifyTime,
      accessTime: file.accessTime,
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
