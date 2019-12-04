/* eslint-disable no-param-reassign */

const { AttachmentProcessor } = require('@elastic.io/component-commons-library');
const { Transform } = require('stream');
const path = require('path');

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

async function uploadFromSftpToAttachment(logger, file, sftpClient, dir) {
  const filePath = path.join(dir, file.name);
  const transform = new Transform({
    writableObjectMode: true,
    readableObjectMode: true,
    transform: (chunk, _, cb) => {
      cb(null, chunk);
    },
  });
  logger.info('About to start saving file: %s', filePath);
  await sftpClient.get(filePath, transform);

  const attachmentProcessor = new AttachmentProcessor();
  const uploadResult = await attachmentProcessor.uploadAttachment(transform);
  const attachmentUrl = uploadResult.config.url;
  logger.info('File %s successfully uploaded to URL: %s', filePath, attachmentUrl);
  file.attachments = {
    [file.name]: {
      url: uploadResult.config.url,
      size: file.size,
    },
  };
  file.attachment_url = attachmentUrl;
  return file;
}

exports.addAttachment = addAttachment;
exports.uploadFromSftpToAttachment = uploadFromSftpToAttachment;
