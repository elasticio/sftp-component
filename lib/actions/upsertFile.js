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
  if (!sftpClient) sftpClient = new Sftp(this.logger, cfg);
  sftpClient.setLogger(this.logger);
  if (!sftpClient.isConnected()) await sftpClient.connect();

  let result;
  try {
    const upsertObjectAction = new SftpUpsertObject(this.logger, sftpClient);
    result = await upsertObjectAction.process(msg, cfg, snapshot);
  } finally {
    await sftpClient.end();
  }
  return result;
};
