const { UpsertObjectById } = require('@elastic.io/oih-standard-library/lib/actions/upsert');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const path = require('path');
const { getUserAgent } = require('./utils');

class SftpUpsertObject extends UpsertObjectById {
  constructor(logger, client) {
    super(logger);
    this.client = client;
  }

  // eslint-disable-next-line no-unused-vars,class-methods-use-this
  getCriteria(msg, cfg) {
    return msg.body.filename;
  }

  // eslint-disable-next-line no-unused-vars,class-methods-use-this
  async getType(cfg, msg) {
    return 'file';
  }

  // eslint-disable-next-line no-unused-vars,class-methods-use-this
  async getObjectFromMessage(msg, cfg) {
    const attachmentProcessor = new AttachmentProcessor(getUserAgent(), msg.id);
    const fileStream = await attachmentProcessor.getAttachment(msg.body.attachmentUrl, 'stream');
    return { fileStream: fileStream.data };
  }

  // eslint-disable-next-line no-unused-vars
  async lookupObject(filename, cfg) {
    const objectExists = await this.client.exists(filename);
    return objectExists;
  }

  async upsertFile(filename, fileExists, attachment, cfg) {
    const { updateBehavior } = cfg;
    if (fileExists) {
      this.logger.info('File with given name exists');
      if (updateBehavior === 'error') {
        throw new Error('File with given name exists. File updates are not permissible as per the current configuration');
      }
    } else {
      this.logger.info('File with given name does not exist');
      const dirname = path.posix.dirname(filename);
      const dirExists = await this.client.exists(dirname);
      if (!dirExists) {
        await this.client.mkdir(dirname, true);
      }
    }

    let writeMode;
    if (updateBehavior === 'overwrite') {
      writeMode = 'w';
    }
    if (updateBehavior === 'append') {
      writeMode = 'a';
    }

    await this.client.put(attachment.fileStream, filename, {
      encoding: cfg.encoding,
      mode: cfg.fileMod,
      flags: writeMode,
    });

    const resultingFile = await this.client.stat(filename);
    return resultingFile;
  }

  async updateObject(filename, objectType, attachment, cfg) {
    return this.upsertFile(filename, true, attachment, cfg);
  }

  async createObject(object, cfg, msg) {
    return this.upsertFile(this.getCriteria(msg, cfg), false, object, cfg);
  }
}

exports.SftpUpsertObject = SftpUpsertObject;
