import { messages } from 'elasticio-node';
import Sftp from '../Sftp';
import { prepareUploadFilename, prepareUploadKeyname, normalizeDirectoryName, getFileCorrectPath } from '../utils/utils';

let sftpClient: Sftp;

export async function processAction(msg, cfg) {
  this.logger.info('"Upload Files From Attachments Header" action started');

  sftpClient ||= new Sftp(this.logger, cfg);
  sftpClient.setLogger(this.logger);

  const result = {
    results: [] as any[],
  };
  const { directory: directoryPath = '/' } = cfg;
  const directory = normalizeDirectoryName(directoryPath);
  const filename = prepareUploadFilename(msg);
  this.logger.debug(`Prepared filename: ${filename}`);

  const isExists = await sftpClient.exists(directory);
  if (!isExists) {
    await sftpClient.mkdir(directory, true);
  }

  this.logger.info(`Found ${Object.keys(msg.attachments).length} attachments`);
  for (const [key, attachment] of Object.entries(msg.attachments)) {
    const keyName = prepareUploadKeyname(key, filename, msg);
    const targetPath = getFileCorrectPath(directory, keyName);
    this.logger.debug('Writing attachment to targetPath');

    await sftpClient.put((attachment as any)?.url, targetPath, { encoding: null });
    this.logger.info(`Attachment ${keyName} uploaded successfully`);

    result.results.push({
      attachment: key,
      uploadedOn: new Date().toISOString(),
      path: targetPath,
    });
  }
  this.logger.info('"Upload Files From Attachments Header" action completed successfully');
  return messages.newMessageWithBody(result);
}

module.exports.process = processAction;
