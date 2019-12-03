const { SftpUpsertObject } = require('../utils/upsertUtil');
const Sftp = require('../Sftp');

let sftpClient;

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
exports.process = async function processAction(msg, cfg, snapshot = {}) {
  if (!sftpClient) {
    sftpClient = new Sftp(this.logger, cfg);
    await sftpClient.connect();
  }

  const upsertObjectAction = new SftpUpsertObject(this.logger, sftpClient);
  const result = await upsertObjectAction.process(msg, cfg, snapshot);
  return result;
};

// eslint-disable-next-line no-unused-vars
exports.shutdown = async function shutdown(cfg) {
  await sftpClient.end();
};
