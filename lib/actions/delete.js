const { SftpDelete } = require('../utils/deleteUtil');
const Sftp = require('../Sftp');

let sftpClient;

async function process(msg, cfg, snapshot = {}) {
  if (!sftpClient) sftpClient = new Sftp(this.logger, cfg);
  if (!sftpClient.isConnected()) await sftpClient.connect();
  sftpClient.setLogger(this.logger);
  const deleteAction = new SftpDelete(this.logger, sftpClient);
  return deleteAction.process(msg, cfg, snapshot);
}

module.exports.process = process;
