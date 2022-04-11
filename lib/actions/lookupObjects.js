const { messages } = require('elasticio-node');

// const Sftp = require('../Sftp');

async function process(msg) {
  console.log(234);
  // const sftpClient = new Sftp(this.logger, cfg);
  // await sftpClient.connect();
  // this.logger.info('Start moving file...');
  // await sftpClient.move(msg.body.filename, msg.body.newFilename);
  // await sftpClient.end();
  await this.emit('data', messages.newMessageWithBody(msg.body));
}

module.exports.process = process;
