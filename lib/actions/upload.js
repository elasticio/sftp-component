/* eslint-disable no-await-in-loop */
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const path = require('path');
const eioUtils = require('elasticio-node').messages;
const Sftp = require('../Sftp');

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
exports.process = async function processAction(msg, cfg) {
  this.logger.info(`Connecting to sftp server...`);
  const sftp = new Sftp(this.logger, cfg);
  await sftp.connect();

  const result = {
    results: [],
  };
  const dir = cfg.directory || '/';
  // eslint-disable-next-line no-nested-ternary
  const filename = msg.body.filename
    ? (Object.keys(msg.attachments).length > 1 ? msg.body.filename.replace('.[1-9a-zA-Z]+$') : msg.body.filename)
    : null;
  this.logger.info(`Prepared filename: ${filename}`);

  const isExists = await sftp.exists(dir);
  if (!isExists) {
    await sftp.mkdir(dir, true);
  }

  this.logger.info(`Found ${Object.keys(msg.attachments).length} attachments`);
  // eslint-disable-next-line no-restricted-syntax
  for (const key of Object.keys(msg.attachments)) {
    const attachment = msg.attachments[key];
    const cur = await sftp.cwd();
    // eslint-disable-next-line no-nested-ternary
    const keyName = filename
      ? (Object.keys(msg.attachments).length > 1 ? filename + '_' + key : filename)
      : key;
    const targetPath = (cur.charAt(0) === '/') ? path.posix.resolve(dir, keyName) : path.resolve(dir, keyName);
    this.logger.info(`Writing attachment to ${targetPath}`);

    this.logger.info(`Getting attachment for ${key}`);
    const file = await new AttachmentProcessor().getAttachment(attachment.url, 'stream');
    this.logger.info(`Uploading ${key} to ${targetPath}`);
    await sftp.put(file.data, targetPath, { encoding: null });
    this.logger.info(`${key} uploaded successfully`);

    result.results.push({
      attachment: key,
      uploadedOn: new Date().toISOString(),
      fileName: targetPath,
    });
  }
  await sftp.end();
  return eioUtils.newMessageWithBody(result);
};
