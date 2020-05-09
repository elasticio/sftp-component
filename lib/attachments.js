/* eslint-disable no-param-reassign */

const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { Transform, Readable } = require('stream');
const path = require('path');
const { unixTimeToIsoDate } = require('./utils/utils');

const MB_TO_BYTES = 1024 * 1024;
// filesize returned in bytes
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE * MB_TO_BYTES || 10 * MB_TO_BYTES;

async function addAttachment(msg, name, stream, contentLength) {
  try {
    if (contentLength > MAX_FILE_SIZE) {
      throw new Error(`File is ${contentLength} bytes, and is too large to upload as an attachment. Max attachment size is ${MAX_FILE_SIZE} bytes`);
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
    throw new Error(`File is ${fileSize} bytes, and is too large to upload as an attachment. Max attachment size is ${MAX_FILE_SIZE} bytes`);
  }
  const transform = new Transform({
    writableObjectMode: true,
    readableObjectMode: true,
    transform: (chunk, _, cb) => {
      cb(null, chunk);
    },
  });

  logger.info('About to start saving file: %s', filePath);
  client.get(filePath, transform);
  const attachmentProcessor = new AttachmentProcessor();
  const uploadResult = await attachmentProcessor.uploadAttachment(transform);
  const attachmentUrl = uploadResult.config.url;
  logger.info('File %s successfully uploaded to URL: %s', filePath, attachmentUrl);
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
    throw new Error(`File is ${fileSize} bytes, and is too large to upload as an attachment. Max attachment size is ${MAX_FILE_SIZE} bytes`);
  }

  const buffer = await client.get(filePath);
  const readStream = new Readable();
  readStream.push(buffer);
  readStream.push(null);
  logger.info('About to start saving file: %s', filePath);

  const attachmentProcessor = new AttachmentProcessor();
  let uploadResult;
  try {
    uploadResult = await attachmentProcessor.uploadAttachment(readStream);
  } catch (e) {
    context.logger.error(e);
    throw e;
  }
  const attachmentUrl = uploadResult.config.url;
  logger.info('File %s successfully uploaded to URL: %s', filePath, attachmentUrl);
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
