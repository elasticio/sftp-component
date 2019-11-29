const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const path = require('path');
const eioUtils = require('elasticio-node').messages;
const Sftp = require('../Sftp');

let sftpClient;

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
exports.process = async function processAction(msg, cfg) {
  if(!sftpClient) {
    sftpClient = new Sftp(this.logger, cfg);
    await sftpClient.connect();
  }

  const { filename, attachmentUrl } = msg.body;
  const { updateBehavior } = cfg;

  const fileExists = await sftpClient.exists(filename);

  if (fileExists) {
    this.logger.info(`File ${filename} exists.`);

    if (updateBehavior === 'error') {
      throw new Error(`File ${filename} exists. File updates are not permissible as per the current configuration.`);
    }
  } else {
    this.logger.info(`File ${filename} does not exist.`);

    const dirname = path.posix.dirname(filename);
    const dirExists = await sftpClient.exists(dirname);
    if (!dirExists) {
      await sftpClient.mkdir(dirname, true);
    }
  }

  let writeMode;
  if (updateBehavior === 'overwrite') {
    writeMode = 'w';
  }
  if (updateBehavior === 'append') {
    writeMode = 'a';
  }

  this.logger.info(`Getting attachment for ${attachmentUrl} ...`);
  console.log('Pre-attachment memory: ' + JSON.stringify(process.memoryUsage()));
  const fileContents = await new AttachmentProcessor().getAttachment(attachmentUrl, 'stream');
  this.logger.info('Uploading file ...');
  await sftpClient.put(fileContents.data, filename, {
    encoding: null,
    flags: writeMode,
  });
  console.log('Post-Attachment memory: ' + JSON.stringify(process.memoryUsage()));
  this.logger.info(`${filename} uploaded successfully`);

  const resultingFile = await sftpClient.stat(filename);
  return eioUtils.newMessageWithBody(resultingFile);
};

// eslint-disable-next-line no-unused-vars
exports.shutdown = async function shutdown(cfg) {
  await sftpClient.end();
};
