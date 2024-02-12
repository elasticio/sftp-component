/* eslint-disable guard-for-in, no-restricted-syntax, no-param-reassign */
const path = require('path');
const { MAX_FILE_SIZE } = require('../constants');

async function getFileContentInBase64(context, body, dir) {
  const { logger, client } = context;
  logger.info(1);
  const filePath = path.join(dir, body.name);
  const fileSize = body.size;
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(`File size is ${fileSize} bytes, it violates the variable MAX_FILE_SIZE, which is currently set to ${MAX_FILE_SIZE} bytes`);
  }

  logger.debug('Going to create read stream');
  const dataStream = client.getReadStream(filePath);

  // Create a buffer to store the file content
  const bufferArray = [];

  // Listen for data events on the read stream
  dataStream.on('data', (chunk) => {
    logger.info('data');
    bufferArray.push(chunk);
  });

  // Listen for the end of the read stream
  dataStream.on('end', () => {
    logger.info('end');
    // Concatenate all the chunks into a single buffer
    const fileBuffer = Buffer.concat(bufferArray);

    // Convert the buffer to a base64 string
    const base64String = fileBuffer.toString('base64');

    // Now you have the file content as a base64 string
    logger.info('Base64 string:', base64String);
  });

  // Handle errors
  dataStream.on('error', (error) => {
    logger.error('Error reading file:', error);
  });

  const curUsed = process.memoryUsage();
  for (const key in curUsed) { logger.debug(`post done...' ${key} ${Math.round((curUsed[key] / 1024 / 1024) * 100) / 100} MB`); }

  logger.info('File is successfully uploaded to URL');
  return { body };
}

exports.getFileContentInBase64 = getFileContentInBase64;
