/* eslint-disable no-param-reassign */

const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { Transform, Readable } = require('stream');
const path = require('path');
const { unixTimeToIsoDate } = require('./utils/utils');
const { MAX_FILE_SIZE } = require('./constants');

async function addAttachment(msg, name, stream, contentLength) {
  try {
    if (contentLength > MAX_FILE_SIZE) {
      throw new Error(`File size is ${contentLength} bytes, it violates the variable MAX_FILE_SIZE, which is currently set to ${MAX_FILE_SIZE} bytes`);
    }
    const result = await new AttachmentProcessor().uploadAttachment(stream, 'stream');
    msg.attachments[name] = {
      url: result.config.url,
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

async function uploadFromSftpToAttachment(context, body, dir) {
  const { logger, client } = context;
  const filePath = path.join(dir, body.name);
  const fileSize = body.size;
  if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File size is ${fileSize} bytes, it violates the variable MAX_FILE_SIZE, which is currently set to ${MAX_FILE_SIZE} bytes`);
  }
  const transform = new Transform({
    writableObjectMode: true,
    readableObjectMode: true,
    transform: (chunk, _, cb) => {
      cb(null, chunk);
    },
  });

  logger.info('About to start saving file');
  client.get(filePath, transform);
  const attachmentProcessor = new AttachmentProcessor();
  const uploadResult = await attachmentProcessor.uploadAttachment(transform);
  const attachmentUrl = uploadResult.config.url;
  logger.info('File is successfully uploaded to URL');
  const attachments = {
    [body.name]: {
      url: uploadResult.config.url,
      size: body.size,
    },
  };
  body.attachment_url = attachmentUrl;
  fillOutputBody(body, dir);
  return { body, attachments };
}

async function uploadFromSftpToAttachmentBuffer(context, body, dir) {
  const { logger, client } = context;
  const filePath = path.join(dir, body.name);
  const fileSize = body.size;
  if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File size is ${fileSize} bytes, it violates the variable MAX_FILE_SIZE, which is currently set to ${MAX_FILE_SIZE} bytes`);
  }

  const buffer = await client.get(filePath);
  const readStream = new Readable();
  readStream.push(buffer);
  readStream.push(null);
  logger.info('About to start saving file');

  const attachmentProcessor = new AttachmentProcessor();
  let uploadResult;
  try {
    uploadResult = await attachmentProcessor.uploadAttachment(readStream);
  } catch (e) {
    context.logger.error('Error occurred while uploading an attachment');
    throw e;
  }
  const attachmentUrl = uploadResult.config.url;
  logger.info('File is successfully uploaded to URL');
  const attachments = {
    [body.name]: {
      url: uploadResult.config.url,
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
exports.uploadFromSftpToAttachment = uploadFromSftpToAttachment;
exports.uploadFromSftpToAttachmentBuffer = uploadFromSftpToAttachmentBuffer;
exports.fillOutputBody = fillOutputBody;
