const Client = require('ssh2-sftp-client');
const request = require('request');
const path = require('path');
const eioUtils = require('elasticio-node').messages;

const sftp = new Client();

function createConnectObject(cfg) {
  return {
    host: cfg.host,
    port: cfg.port,
    username: cfg.username,
    password: cfg.password,
  };
}

/**
 * This function will be called during component intialization
 *
 * @param cfg
 * @returns {Promise}
 */
async function init(cfg) {
  const connectObject = createConnectObject(cfg);
  await sftp.connect(connectObject);
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
    const targetPath = path.resolve(dir, key);
    // eslint-disable-next-line no-await-in-loop
    await sftp.put(request(attachment.url), targetPath);
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
