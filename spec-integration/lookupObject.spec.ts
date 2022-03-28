require('dotenv').config();

const path = require('path');
const Sftp = require('../lib/Sftp');
const logger = require('@elastic.io/component-commons-library/lib/logger/logger').getLogger();
const { Transform, Readable } = require('stream');

const host = process.env.SFTP_HOSTNAME;
const username = process.env.SFTP_USER;
const password = process.env.SFTP_PASSWORD;
const port = process.env.PORT;
const testNumber = Math.floor(Math.random() * 10000);
const directory = `/www/integration-test/test-${testNumber}/`;
const cfg = {
  host,
  username,
  password,
  port,
  directory,
};

const getFile = async (client, dir, filename) => {
  const list = await client.list(dir, new RegExp(filename));
  const files = list.filter((file) => file.name === filename && file.type === '-');
  if (files.length !== 1) {
    if (files.length === 0) {
      console.log('nf');
    } else {
      console.log('more than 1');
    }
    return null;
  }
  const [file] = files;
  console.log('File exists in given directory');
  return file;
}

const uploadFromSftpToAttachment = async (context, body, dir) => {
  const { logger, client } = context;
  const filePath = path.join(dir, body.name);
  const fileSize = body.size;
  const MAX_FILE_SIZE = 104857600;
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(`File size is ${fileSize} bytes, it violates the variable MAX_FILE_SIZE, which is currently set to ${MAX_FILE_SIZE} bytes`);
  }

  // const attachmentProcessor = new AttachmentProcessor();
  // const uploadResult = await attachmentProcessor.uploadAttachment(transform);
  // const attachmentUrl = uploadResult.config.url;
  // logger.info('File is successfully uploaded to URL');
  // const attachments = {
  //   [body.name]: {
  //     url: uploadResult.config.url,
  //     size: body.size,
  //   },
  // };
  // body.attachment_url = attachmentUrl;
  // fillOutputBody(body, dir);
  // return { body, attachments };
}

describe('SFTP integration test - lookup object', () => {
  it.only('lookup object', async () => {
    const sftpClient = new Sftp(logger, cfg);
    await sftpClient.connect();
    const filePath = '/www/ilya_s/lnuno_sftp_50k_1_csv50.csv';
    const directory = path.posix.dirname(filePath);
    const filename = path.basename(filePath);
    const file = await getFile(sftpClient, directory, filename);
    await uploadFromSftpToAttachment({ client: sftpClient, logger }, file, directory);
  })
});
