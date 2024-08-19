const { SftpLookupObject } = require('../utils/lookupObjectUtil');
const Sftp = require('../Sftp');

let sftpClient;

async function process(msg, cfg, snapshot = {}) {
  if (!sftpClient) sftpClient = new Sftp(this.logger, cfg);
  sftpClient.setLogger(this.logger);
  if (!sftpClient.isConnected()) await sftpClient.connect();
  const lookupObjectAction = new SftpLookupObject(this.logger, sftpClient);
  const result = await lookupObjectAction.process(msg, cfg, snapshot);
  await sftpClient.end();
  return result;
}

module.exports.process = process;
