import { messages } from 'elasticio-node';
import Sftp from '../Sftp';

let sftpClient: Sftp;

export async function processAction(msg, cfg) {
  this.logger.info('"Delete File" action started');

  sftpClient ||= new Sftp(this.logger, cfg);
  sftpClient.setLogger(this.logger);

  const { path } = msg.body;

  if (!path) {
    this.logger.debug('Path to file not provided.');
    return messages.newEmptyMessage();
  }

  const fileExists = await sftpClient.exists(path);

  if (!fileExists) {
    this.logger.debug('Specified file does not exist.');
    return messages.newEmptyMessage();
  }

  await sftpClient.delete(path);

  this.logger.info('"Delete File" action completed successfully');
  return messages.newMessageWithBody({ id: path });
}

module.exports.process = processAction;
