require('dotenv').config();

const { AttachmentProcessor } = require('@elastic.io/component-commons-library/dist/src/attachment/AttachmentProcessor');
const path = require('path');
const Sftp = require('../lib/Sftp');
const { getLogger } = require('@elastic.io/component-commons-library/dist/src/logger/logger');
const { Transform, Readable } = require('stream');
const fs = require('fs');
const { SftpUpsertObject } = require('../lib/utils/upsertUtil');

const logger = getLogger();

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
  const buffer = await client.get(filePath);
  const readStream = new Readable();
  readStream.push(buffer);
  readStream.push(null);

  // it works //////
  // const ws = fs.createWriteStream('./myOutput.csv');
  // readStream.pipe(ws);
  // readStream.on('end', () => console.log('done'));
  //////////////////

  const attachmentProcessor = new AttachmentProcessor();
  const uploadResult = await attachmentProcessor.uploadAttachment(readStream, 'stream');
  console.log(uploadResult.data);
}

describe('SFTP integration test - lookup object', () => {
  it.only('lookup object', async () => {
    const sftpClient = new Sftp(logger, cfg);
    await sftpClient.connect();
    const filePath = '/www/ilya_s/11.csv';
    const directory = path.posix.dirname(filePath);
    const filename = path.basename(filePath);
    const file = await getFile(sftpClient, directory, filename);
    await uploadFromSftpToAttachment({ client: sftpClient, logger }, file, directory);
  })
  it('upsert object', async () => {
    const sftpClient = new Sftp(logger, cfg);
    await sftpClient.connect();

    const msg = {
      body: {
        attachmentUrl: 'http://localhost:3002/objects/3d6228cc-f969-4642-82e6-92cea5c2d119?storage_type=maester',
        filename: '/www/ilya_s/test_res.csv'
      }
    };

    const upsertObjectAction = new SftpUpsertObject(logger, sftpClient);
    const result = await upsertObjectAction.process(msg, { ...cfg, updateBehavior: 'overwrite' }, {});
    console.log(result);
  })
});
