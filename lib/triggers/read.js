const { messages } = require('elasticio-node');
const { Readable } = require('stream');
const Sftp = require('../Sftp');
const attachments = require('../attachments');
const { MAX_FILE_SIZE } = require('../constants');

const PROCESSED_FOLDER_NAME = '.elasticio_processed';

function isDirectory(obj) {
  return obj.type === 'd';
}

function filterFilesByPattern(list, pattern) {
  const files = list.filter((item) => !isDirectory(item) && item.size <= MAX_FILE_SIZE);
  const regExp = new RegExp(pattern || '');
  return files.filter((file) => regExp.test(file.name));
}

async function moveFile(sftp, dir, fileName, newFileName) {
  const fromPath = Sftp.createPath(dir, fileName);
  const toPath = Sftp.createPath(dir, `${PROCESSED_FOLDER_NAME}/${newFileName}`);

  const path = Sftp.createPath(dir, PROCESSED_FOLDER_NAME);
  const pathExists = await sftp.exists(path);
  if (!pathExists) {
    await sftp.mkdir(path, true);
  }
  await sftp.move(fromPath, toPath);
}

async function createMessageForFile(sftp, dir, file) {
  const fileName = file.name;
  const newFileName = `${fileName}_${new Date().getTime()}`;

  const msg = messages.newMessageWithBody({
    filename: fileName,
    size: file.size,
  });

  this.logger.info('Moving file into staging folder');
  await moveFile.call(this, sftp, dir, fileName, newFileName);
  this.logger.info('Reading file into read stream');
  const buffer = await sftp.get(Sftp.createPath(dir, `${PROCESSED_FOLDER_NAME}/${newFileName}`));
  const readStream = new Readable();
  readStream.push(buffer);
  readStream.push(null);
  await attachments.addAttachment.call(this, msg, fileName, readStream, file.size);
  return msg;
}

async function readFiles(sftp, dir, files) {
  // eslint-disable-next-line no-restricted-syntax
  for (const file of files) {
    this.logger.info('Processing file');
    // eslint-disable-next-line no-await-in-loop
    const msg = await createMessageForFile.call(this, sftp, dir, file);
    // eslint-disable-next-line no-await-in-loop
    await this.emit('data', msg);
  }
}

exports.process = async function process(msg, cfg) {
  const sftp = new Sftp(this.logger, cfg);
  await sftp.connect();

  let dir = cfg.directory || '/';
  if (dir.charAt(0) !== '/') {
    dir = `/${dir}`;
  }

  this.logger.info('Finding files in directory');
  const list = await sftp.list(dir, new RegExp(cfg.pattern || ''));
  this.logger.debug('Found files: %s', Object.keys(list.filter((item) => item.type === '-')).length);
  const files = await filterFilesByPattern(list, cfg.pattern);
  this.logger.debug('Files that match filter: %s', Object.keys(files.map((file) => file.name)).length);
  await readFiles.call(this, sftp, dir, files);
  await sftp.end();
};
