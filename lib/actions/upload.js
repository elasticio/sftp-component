/* eslint-disable no-await-in-loop */
const Client = require('ssh2-sftp-client');
const { promisify } = require('util');
const request = promisify(require('request'));
const path = require('path');
const eioUtils = require('elasticio-node').messages;

const client = new Client();

/**
 * This function will be called during component intialization
 */
module.init = async function init(cfg) {
  await client.connect({
    host: cfg.host,
    port: cfg.port || 22,
    username: cfg.username,
    password: cfg.password,
  });
};

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
module.process = async function processAction(msg, cfg) {
  const result = {
    results: [],
  };
  const dir = cfg.directory || '/';
  const isExists = await client.exists(dir);
  if (!isExists) {
    await client.mkdir(dir, true);
  }
  // eslint-disable-next-line no-restricted-syntax
  for (const key of Object.keys(msg.attachments)) {
    const attachment = msg.attachments[key];
    const cur = await client.cwd();
    const targetPath = (cur.charAt(0) === '/') ? path.posix.resolve(dir, key) : path.resolve(dir, key);

    await client.put((await request({
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
};

module.exports.shutdown = function shutdownHook() {
  client.end();
};
