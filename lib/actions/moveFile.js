const { messages } = require('elasticio-node');

const Sftp = require('../Sftp');

async function process(msg, cfg) {
  const sftpClient = new Sftp(this.logger, cfg);
  await sftpClient.connect();
  this.logger.info(`Moving file from path: ${msg.body.filename} to ${msg.body.newFilename}`);
  const result = await sftpClient.rename(msg.body.filename, msg.body.newFilename);
  await sftpClient.end();
  await this.emit('data', messages.newMessageWithBody(result));
}

module.exports.process = process;
