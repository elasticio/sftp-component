const { SftpDelete } = require('../utils/deleteUtil');
const Sftp = require('../Sftp');

async function process(msg, cfg, snapshot = {}) {
  const sftpClient = new Sftp(this.logger, cfg);
  await sftpClient.connect();
  const deleteAction = new SftpDelete(this.logger, sftpClient);
  return deleteAction.process(msg, cfg, snapshot);
}

module.exports.process = process;
