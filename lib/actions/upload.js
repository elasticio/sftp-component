/* eslint-disable no-await-in-loop */
const { Logger } = require('@elastic.io/component-commons-library');
const { promisify } = require('util');
const request = promisify(require('request'));
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
  const logger = Logger.getLogger();
  const sftp = new Sftp(logger, cfg);
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

    await sftp.put((await request({
      url: attachment.url,
      encoding: null,
    })).body, targetPath, { encoding: null });

    result.results.push({
      attachment: key,
      uploadedOn: new Date().toISOString(),
      fileName: targetPath,
    });
  }
  await this.emit('data', eioUtils.newMessageWithBody(result));
  await sftp.end();
};
