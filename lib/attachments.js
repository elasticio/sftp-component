/* eslint-disable no-param-reassign */

const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { Transform, Readable } = require('stream');
const path = require('path');
const { unixTimeToIsoDate } = require('../lib/utils/utils');

async function addAttachment(msg, name, stream, contentLength) {
  try {
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
}

async function uploadFromSftpToAttachment(context, body, dir) {
  const { logger, client } = context;
  const filePath = path.join(dir, body.name);
  const transform = new Transform({
    writableObjectMode: true,
    readableObjectMode: true,
    transform: (chunk, _, cb) => {
      cb(null, chunk);
    },
  });
  logger.info('About to start saving file: %s', filePath);
  await client.get(filePath, transform);

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
  const buffer = await client.get(filePath);
  const readStream = new Readable();
  readStream.push(buffer);
  readStream.push(null);
  logger.info('About to start saving file: %s', filePath);

  const attachmentProcessor = new AttachmentProcessor();
  const uploadResult = await attachmentProcessor.uploadAttachment(readStream);
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
