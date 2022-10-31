/* eslint-disable guard-for-in, no-restricted-syntax, no-param-reassign */
const path = require('path');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const stream = require('stream');
const { unixTimeToIsoDate } = require('./utils/utils');
const { MAX_FILE_SIZE } = require('./constants');
const { getUserAgent } = require('./utils/utils');

async function addAttachment(msg, name, getStream, contentLength) {
  try {
    if (contentLength > MAX_FILE_SIZE) {
      throw new Error(`File size is ${contentLength} bytes, it violates the variable MAX_FILE_SIZE, which is currently set to ${MAX_FILE_SIZE} bytes`);
    }
    const attachmentProcessor = new AttachmentProcessor(getUserAgent(), msg.id);
    const attachmentId = await attachmentProcessor.uploadAttachment(getStream);
    const attachmentUrl = attachmentProcessor.getMaesterAttachmentUrlById(attachmentId);
    const curUsed = process.memoryUsage();
    for (const key in curUsed) { this.logger.debug(`post done...' ${key} ${Math.round((curUsed[key] / 1024 / 1024) * 100) / 100} MB`); }
    msg.attachments[name] = {
      url: attachmentUrl,
      size: contentLength,
    };
  } catch (e) {
    this.emit('error', e);
  }
}

function fillOutputBody(body, dir) {
  body.directory = dir;
  body.path = path.join(dir, body.name);
  body.modifyTime = unixTimeToIsoDate(body.modifyTime);
  body.accessTime = unixTimeToIsoDate(body.accessTime);
  return body;
}

async function uploadFromSftpToAttachmentBuffer(context, body, dir, token) {
  const { logger, client } = context;
  const filePath = path.join(dir, body.name);
  const fileSize = body.size;
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(`File size is ${fileSize} bytes, it violates the variable MAX_FILE_SIZE, which is currently set to ${MAX_FILE_SIZE} bytes`);
  }

  logger.debug('Going to create read stream');
  const dataStream = client.getReadStream(filePath);
  let bytesProceed = 0;
  let percentCompleted = 0;

  const trans = new stream.Transform({
    transform(chunk, _encoding, callback) {
      try {
        bytesProceed += chunk.length;
        const percent = Math.round((bytesProceed / fileSize) * 10);
        if (percent > percentCompleted) {
          logger.debug(`${percent}0% file processing completed`);
          percentCompleted = percent;
        }
        if (token) token.reset();
        callback(null, chunk);
      } catch (err) {
        callback(err);
      }
    },
  });
  const dataWithLogs = dataStream.pipe(trans);

  const getStream = async () => dataWithLogs;

  logger.debug('Read stream created, start uploading');
  const attachmentProcessor = new AttachmentProcessor(getUserAgent());

  const attachmentId = await attachmentProcessor.uploadAttachment(getStream);
  const curUsed = process.memoryUsage();
  for (const key in curUsed) { logger.debug(`post done...' ${key} ${Math.round((curUsed[key] / 1024 / 1024) * 100) / 100} MB`); }

  logger.info('File is successfully uploaded to URL');
  const attachmentUrl = attachmentProcessor.getMaesterAttachmentUrlById(attachmentId);
  const attachments = {
    [body.name]: {
      url: attachmentUrl,
      size: body.size,
    },
  };
  body.attachment_url = attachmentUrl;
  body.directory = dir;
  body.path = filePath;
  body.modifyTime = unixTimeToIsoDate(body.modifyTime);
  body.accessTime = unixTimeToIsoDate(body.accessTime);
  return { body, attachments };
}

exports.addAttachment = addAttachment;
exports.uploadFromSftpToAttachmentBuffer = uploadFromSftpToAttachmentBuffer;
exports.fillOutputBody = fillOutputBody;
