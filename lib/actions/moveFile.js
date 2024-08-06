const { messages } = require('elasticio-node');

const Sftp = require('../Sftp');

let sftpClient;

async function process(msg, cfg) {
  if (!sftpClient) sftpClient = new Sftp(this.logger, cfg);
  if (!sftpClient.isConnected()) await sftpClient.connect();
  sftpClient.setLogger(this.logger);
  this.logger.info('Start moving file...');
  await sftpClient.move(msg.body.filename, msg.body.newFilename);
  await sftpClient.end();
  await this.emit('data', messages.newMessageWithBody(msg.body));
}

module.exports.process = process;
