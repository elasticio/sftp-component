const { Logger } = require('@elastic.io/component-commons-library');
const { messages } = require('elasticio-node');
const { Readable } = require('stream');
const Sftp = require('../Sftp');
const attachments = require('../attachments');

const PROCESSED_FOLDER_NAME = '.elasticio_processed';
const MAX_FILE_SIZE = 104857600; // 100 MiB

function isDirectory(obj) {
  return obj.type === 'd';
}

function filterFilesByPattern(list, cfg) {
  const files = list.filter((item) => !isDirectory(item) && item.size <= MAX_FILE_SIZE);
  const regExp = new RegExp(cfg.pattern || '');
  return files.filter((file) => regExp.test(file.name));
}

async function moveFile(sftp, dir, fileName, newFileName) {
  const fromPath = Sftp.createPath(dir, fileName);
  const toPath = Sftp.createPath(dir, `${PROCESSED_FOLDER_NAME}/${newFileName}`);

  const path = Sftp.createPath(dir, PROCESSED_FOLDER_NAME);
  if (!sftp.exists(path)) {
    await sftp.mkdir(path, true);
  }
  await sftp.rename(fromPath, toPath);
}

async function createMessageForFile(sftp, dir, file) {
  const fileName = file.name;
  const newFileName = `${fileName}_${new Date().getTime()}`;

  const msg = messages.newMessageWithBody({
    filename: fileName,
    size: file.size,
  });

  await moveFile(sftp, dir, fileName, newFileName);
  const buffer = await sftp.get(Sftp.createPath(dir, `${PROCESSED_FOLDER_NAME}/${newFileName}`));
  const readStream = new Readable();
  readStream.push(buffer);
  readStream.push(null);
  await attachments.addAttachment(msg, fileName, readStream, file.size);
  return msg;
}

function readFiles(sftp, dir, files) {
  return files.forEach(async (file) => {
    const msg = await createMessageForFile(sftp, dir, file);
    await this.emit('data', msg);
  });
}

exports.process = async function process(msg, cfg) {
  const sftp = new Sftp(this.logger, cfg);
  await sftp.connect();

  let dir = cfg.directory || '/';
  if (dir.charAt(0) !== '/') {
    dir = `/${dir}`;
  }

  const list = await sftp.list(dir, new RegExp(cfg.pattern || ''));
  logger.info('Found the following files: ', list.filter((item) => item.type === '-').map((item) => item.name));
  const files = await filterFilesByPattern(list, cfg);
  logger.info('Files that match filter: ', files.map((file) => file.name));
  await readFiles.call(this, sftp, dir, files);
};
