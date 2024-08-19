const { SftpDelete } = require('../utils/deleteUtil');
const Sftp = require('../Sftp');

let sftpClient;

async function process(msg, cfg, snapshot = {}) {
  if (!sftpClient) sftpClient = new Sftp(this.logger, cfg);
  sftpClient.setLogger(this.logger);
  if (!sftpClient.isConnected()) await sftpClient.connect();
  const deleteAction = new SftpDelete(this.logger, sftpClient);
  return deleteAction.process(msg, cfg, snapshot);
}

module.exports.process = process;
