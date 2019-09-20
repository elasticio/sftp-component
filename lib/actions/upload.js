/* eslint-disable no-await-in-loop */
const Client = require('ssh2-sftp-client');
const { promisify } = require('util');
const request = promisify(require('request'));
const path = require('path');
const eioUtils = require('elasticio-node').messages;

const sftp = new Client();

/**
 * This function will be called during component intialization
 *
 * @param cfg
 * @returns {Promise}
 */
async function init(cfg) {
  await sftp.connect({
    host: cfg.host,
    port: cfg.port,
    username: cfg.username,
    password: cfg.password,
  });
}

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
async function processAction(msg, cfg) {
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
}

module.exports.shutdown = function shutdownHook() {
  sftp.end();
};

module.exports.process = processAction;
module.exports.init = init;
