import { messages } from 'elasticio-node';
import Sftp from '../Sftp';
import { getDirectoryFromPath } from '../utils/utils';

let sftpClient: Sftp;

export async function processAction(msg, cfg) {
  this.logger.info('"Upload File From URL" action started');

  sftpClient ||= new Sftp(this.logger, cfg);
  sftpClient.setLogger(this.logger);

  const { updateBehavior } = cfg;
  const {
    filename,
    attachmentUrl,
    encoding,
    fileMod
  } = msg.body;

  const fileExists = await sftpClient.exists(filename);

  if (fileExists) {
    this.logger.info('File with given name exists');
    if (updateBehavior === 'error') {
      throw new Error('File with given name exists. File updates are not permissible as per the current configuration');
    }
  } else {
    this.logger.info('File with given name does not exist');
    const dirname = getDirectoryFromPath(filename);
    const dirExists = await sftpClient.exists(dirname);
    if (!dirExists) {
      await sftpClient.mkdir(dirname, true);
    }
  }

  let writeMode;
  if (updateBehavior === 'overwrite') writeMode = 'w';
  if (updateBehavior === 'append') writeMode = 'a';

  await sftpClient.put(attachmentUrl, filename, {
    encoding,
    mode: fileMod,
    flags: writeMode,
  });
  const result = await sftpClient.stat(filename);
  this.logger.info('"Upload File From URL" action completed successfully');
  return messages.newMessageWithBody(result);
}

module.exports.process = processAction;
