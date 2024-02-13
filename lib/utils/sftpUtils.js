/* eslint-disable guard-for-in, no-restricted-syntax, no-param-reassign */
const path = require('path');
const { arrayBuffer } = require('node:stream/consumers');
const { MAX_FILE_SIZE } = require('../constants');
const { unixTimeToIsoDate } = require('./utils');

async function getFileContentInBase64(context, body, dir) {
  const { logger, client } = context;
  const filePath = path.join(dir, body.name);
  const fileSize = body.size;
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(`File size is ${fileSize} bytes, it violates the variable MAX_FILE_SIZE, which is currently set to ${MAX_FILE_SIZE} bytes`);
  }

  logger.debug('Going to create read stream');
  const dataStream = client.getReadStream(filePath);

  const bufferFromStream = await arrayBuffer(dataStream);
  const base64Content = Buffer.from(bufferFromStream).toString('base64');

  const curUsed = process.memoryUsage();
  for (const key in curUsed) { logger.debug(`post done...' ${key} ${Math.round((curUsed[key] / 1024 / 1024) * 100) / 100} MB`); }

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
