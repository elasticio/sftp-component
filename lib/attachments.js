/* eslint-disable guard-for-in, no-restricted-syntax, no-param-reassign */
const path = require('path');
const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { unixTimeToIsoDate } = require('./utils/utils');
const { MAX_FILE_SIZE } = require('./constants');

async function addAttachment(msg, name, getStream, contentLength) {
  try {
    if (contentLength > MAX_FILE_SIZE) {
      throw new Error(`File size is ${contentLength} bytes, it violates the variable MAX_FILE_SIZE, which is currently set to ${MAX_FILE_SIZE} bytes`);
    }
    const result = await new AttachmentProcessor().uploadAttachment(getStream);
    const attachmentUrl = `${result.config.url}${result.data.objectId}?storage_type=maester`;
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

async function uploadFromSftpToAttachmentBuffer(context, body, dir) {
  const { logger, client } = context;
  const filePath = path.join(dir, body.name);
  const fileSize = body.size;
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(`File size is ${fileSize} bytes, it violates the variable MAX_FILE_SIZE, which is currently set to ${MAX_FILE_SIZE} bytes`);
  }

  const getStream = async () => client.getReadStream(filePath);
  const attachmentProcessor = new AttachmentProcessor();

  const uploadResult = await attachmentProcessor.uploadAttachment(getStream);
  const curUsed = process.memoryUsage();
  for (const key in curUsed) { logger.debug(`post done...' ${key} ${Math.round((curUsed[key] / 1024 / 1024) * 100) / 100} MB`); }

  const attachmentUrl = `${uploadResult.config.url}${uploadResult.data.objectId}?storage_type=maester`;
  logger.info('File is successfully uploaded to URL');
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
