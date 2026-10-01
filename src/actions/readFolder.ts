import { messages } from '../utils/messages';
import Sftp from '../Sftp';
import { normalizeDirectoryName, formatFile } from '../utils/utils';

let sftpClient: Sftp;

export async function processAction(msg, cfg) {
  this.logger.info('"Read Folder" action started');

  sftpClient ||= new Sftp(this.logger, cfg);
  sftpClient.setLogger(this.logger);

  let directory;
  const { directoryPath } = msg.body;
  if (directoryPath) {
    directory = normalizeDirectoryName(directoryPath);
  } else {
    directory = normalizeDirectoryName(await sftpClient.cwd());
    this.logger.debug(`No directory path provided, using current SFTP directory: ${directory}`);
  }

  if (!(await sftpClient.exists(directory))) {
    throw new Error(`Directory ${directory} is not exist`);
  }
  const listOfItems = await sftpClient.list(directory);

  const items = listOfItems.map((item) => formatFile(item, directory));
  this.logger.debug(`Total items found: ${items.length}`);

  return messages.newMessageWithBody({
    directory,
    files: items.filter((item) => item.type === '-'),
    folders: items.filter((item) => item.type === 'd'),
  });
}

module.exports.process = processAction;
