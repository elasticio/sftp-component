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
  const sftp = new Sftp(this.logger, cfg);
  await sftp.connect();

  const result = {
    results: [],
  };
  const dir = cfg.directory || '/';
  const isExists = await sftp.exists(dir);
  if (!isExists) {
    await sftp.mkdir(dir, true);
  }
  // eslint-disable-next-line no-restricted-syntax
  for (const key of Object.keys(msg.attachments)) {
    const attachment = msg.attachments[key];
    const cur = await sftp.cwd();
    const targetPath = (cur.charAt(0) === '/') ? path.posix.resolve(dir, key) : path.resolve(dir, key);

    const file = await new AttachmentProcessor().getAttachment(attachment.url, 'stream');
    await sftp.put(file.data, targetPath, { encoding: null });

    result.results.push({
      attachment: key,
      uploadedOn: new Date().toISOString(),
      fileName: targetPath,
    });
  }
  await this.emit('data', eioUtils.newMessageWithBody(result));
  await sftp.end();
};
