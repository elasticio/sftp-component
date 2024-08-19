const { messages } = require('elasticio-node');

const Sftp = require('../Sftp');

let sftpClient;

async function process(msg, cfg) {
  if (!sftpClient) sftpClient = new Sftp(this.logger, cfg);
  sftpClient.setLogger(this.logger);
  if (!sftpClient.isConnected()) await sftpClient.connect();
  this.logger.info('Start moving file...');
  await sftpClient.move(msg.body.filename, msg.body.newFilename);
  await sftpClient.end();
  await this.emit('data', messages.newMessageWithBody(msg.body));
}

module.exports.process = process;
