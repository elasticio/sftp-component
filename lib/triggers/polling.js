const { SftpPolling } = require('../utils/pollingUtil');
const Sftp = require('../Sftp');

async function process(msg, cfg, snapshot = {}) {
  const sftpClient = new Sftp(this.logger, cfg);
  await sftpClient.connect();
  const pollingTrigger = new SftpPolling(this.logger, sftpClient);
  return pollingTrigger.process(cfg, snapshot);
}

module.exports.process = process;
