const { SftpPolling } = require('../utils/pollingUtil');
const Sftp = require('../Sftp');

async function process(msg, cfg, snapshot = {}) {
  const sftpClient = new Sftp(this.logger, cfg);
  await sftpClient.connect();
  const pollingTrigger = new SftpPolling(this.logger, this, sftpClient);
  await pollingTrigger.process(cfg, snapshot);
  return sftpClient.end();
}

module.exports.process = process;
