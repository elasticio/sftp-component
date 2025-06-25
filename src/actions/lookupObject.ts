import { messages } from 'elasticio-node';
import Sftp from '../Sftp';
import {
  getDirectoryFromPath,
  getFileNameFromPath,
  getFileCorrectPath,
  formatFile
} from '../utils/utils';

let sftpClient: Sftp;

export async function processAction(msg, cfg) {
  this.logger.info('"Download File by name" action started');

  sftpClient ||= new Sftp(this.logger, cfg);
  sftpClient.setLogger(this.logger);

  const { path: filePath } = msg.body;
  const { emitFileContent, allowCriteriaToBeOmitted } = cfg;

  if (!filePath) {
    this.logger.warn('Path not provided.');
    if (allowCriteriaToBeOmitted !== 'Yes') throw new Error('Empty "Path and File Name" is not allowed.');
    return messages.newEmptyMessage();
  }

  const directory = getDirectoryFromPath(filePath);
  const filename = getFileNameFromPath(filePath);

  this.logger.info('Starting verify if file exists in directory');
  const filesList = await sftpClient.list(directory);
  const files = filesList.filter((file) => file.name === filename && file.type === '-');
  if (files.length !== 1) {
    this.logger.warn(`Found ${files.length} files with provided name in the directory`);
    if (allowCriteriaToBeOmitted !== 'Yes') throw new Error(`Found ${files.length} files with provided name in the directory`);
    return messages.newEmptyMessage();
  }
  const [file] = files;
  this.logger.info('File exists in given directory');

  const fileCorrectPath = getFileCorrectPath(directory, file.name);

  const result = formatFile(file, directory);

  if (emitFileContent) {
    this.logger.info('Getting file content as a Base64 string...');
    const base64Content = await sftpClient.getFile(fileCorrectPath, result.size, 'base64');
    result.base64Content = base64Content;
    this.logger.info('"Download File by name" action completed successfully');
    return messages.newMessageWithBody(result);
  }

  this.logger.info('Uploading file content to the attachment...');
  const attachmentUrl = await sftpClient.getFile(fileCorrectPath, result.size, 'attachment', msg.id);
  result.attachment_url = attachmentUrl;
  const attachments = { [result.name]: { url: attachmentUrl, size: result.size } };
  this.logger.info('"Download File by name" action completed successfully');
  return { ...messages.newMessageWithBody(result), attachments };
}

module.exports.process = processAction;
