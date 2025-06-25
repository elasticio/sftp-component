import { messages } from 'elasticio-node';
import Sftp from '../Sftp';

let sftpClient: Sftp;

export async function processAction(msg, cfg) {
  this.logger.info('"Move File" action started');

  sftpClient ||= new Sftp(this.logger, cfg);
  sftpClient.setLogger(this.logger);

  const { body = {} } = msg;
  const { filename, newFilename } = body;

  if (!filename || !newFilename) {
    this.logger.error('"Current file Name and Path" or "New file Name and Path" not provided.');
    throw new Error('Both "Current file Name and Path" and "New file Name and Path" must be provided.');
  }

  const exists = await sftpClient.exists(filename);
  if (!exists) {
    this.logger.error(`File "${filename}" does not exist.`);
    throw new Error(`File "${filename}" does not exist.`);
  }

  await sftpClient.move(filename, newFilename);

  this.logger.info('"Move File" action completed successfully');
  await this.emit('data', messages.newMessageWithBody(msg.body));
}

module.exports.process = processAction;
