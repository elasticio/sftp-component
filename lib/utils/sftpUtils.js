/* eslint-disable guard-for-in, no-restricted-syntax, no-param-reassign */
const path = require('path');
const { arrayBuffer } = require('node:stream/consumers');
const { MAX_MESSAGE_SIZE } = require('../constants');
const { unixTimeToIsoDate } = require('./utils');

async function getFileContentInBase64(context, body, dir) {
  const { logger, client } = context;
  const filePath = path.join(dir, body.name);
  const fileSize = body.size;
  if (fileSize > MAX_MESSAGE_SIZE) {
    throw new Error(`Message size is ${fileSize} bytes, it violates the platform limit set to 10MB per message`);
  }

  logger.debug('Going to create read stream');
  const dataStream = client.getReadStream(filePath);

  const bufferFromStream = await arrayBuffer(dataStream);
  const base64Content = Buffer.from(bufferFromStream).toString('base64');

  logger.info('File is successfully converted to base64');
  body.attachment_url = '';
  body.directory = dir;
  body.path = filePath;
  body.modifyTime = unixTimeToIsoDate(body.modifyTime);
  body.accessTime = unixTimeToIsoDate(body.accessTime);
  body.base64Content = base64Content;
  return { body };
}

exports.getFileContentInBase64 = getFileContentInBase64;
