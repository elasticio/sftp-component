import { isDateValid, timeToString } from '@elastic.io/component-commons-library';
import { messages } from 'elasticio-node';
import Sftp from '../Sftp';
import {
  timestamp,
  getBiggestDate,
  formatFile,
  getFileCorrectPath,
  normalizeDirectoryName
} from '../utils/utils';

let sftpClient: Sftp;
const isDebugFlow = process.env.ELASTICIO_FLOW_TYPE === 'debug';

async function processTrigger(msg, cfg, snapshot) {
  this.logger.info('"Poll Files" trigger started');

  sftpClient ||= new Sftp(this.logger, cfg);
  sftpClient.setLogger(this.logger);

  const {
    directory: directoryPath = '/',
    pattern,
    startTime,
    endTime,
    emitBehaviour = 'emitIndividually'
  } = cfg;

  const directory = normalizeDirectoryName(directoryPath);
  if (startTime && !isDateValid(startTime)) throw new Error('invalid "Start Time" date format, use ISO 8601 Date time utc format - YYYY-MM-DDThh:mm:ssZ');
  if (endTime && !isDateValid(endTime)) throw new Error('invalid "End Time" date format, use ISO 8601 Date time utc format - YYYY-MM-DDThh:mm:ssZ');
  if (startTime && endTime && timestamp(startTime) >= timestamp(endTime)) throw new Error('"Start Time" should be earlier than "End Time"');

  const from = snapshot?.nextStartTime || snapshot?.startTime || startTime || 0;
  const to = endTime || new Date();

  if (timestamp(from) >= timestamp(to)) {
    this.logger.warn('Flow reached End Time, there will be no files to process');
    return;
  }

  const regExp = new RegExp(pattern || '');
  const listOfFiles = await sftpClient.list(directory);
  const filteredList = listOfFiles
    .filter((file) => file.type === '-')
    .filter((file) => timestamp(file.modifyTime) >= timestamp(from))
    .filter((file) => timestamp(file.modifyTime) < timestamp(to))
    .filter((file) => regExp.test(file.name));

  if (filteredList.length === 0) {
    if (isDebugFlow) {
      throw new Error(`No files found. Execution stopped.
    This error is only applicable to the Retrieve Sample.
    In flow executions there will be no error, just an execution skip.`);
    }
    this.logger.warn('No new files found in the directory matching the criteria');
    return;
  }

  const results: any[] = [];
  const attachments = {};
  for (const file of filteredList) {
    const fileCorrectPath = getFileCorrectPath(directory, file.name);
    const result = formatFile(file, directory);

    const attachmentUrl = await sftpClient.getFile(fileCorrectPath, result.size, 'attachment', msg.id);
    result.attachment_url = attachmentUrl;
    attachments[result.name] = { url: attachmentUrl, size: result.size };
    if (emitBehaviour === 'emitIndividually') {
      await this.emit('data', {
        ...messages.newMessageWithBody(result),
        attachments: { [result.name]: { url: attachmentUrl, size: result.size } }
      });
    } else {
      results.push(result);
    }
  }

  if (emitBehaviour === 'fetchAll') {
    await this.emit('data', {
      ...messages.newMessageWithBody({ results }),
      attachments
    });
  }

  let biggestDate = from;
  biggestDate = getBiggestDate([...filteredList.map((file) => file.modifyTime), biggestDate]);
  const snap = { nextStartTime: biggestDate };
  this.logger.info(`Next execution start time set to ${timeToString(snap.nextStartTime)}`);
  await this.emit('snapshot', snap);

  this.logger.info('"Poll Files" trigger completed successfully');
}

module.exports.process = processTrigger;
