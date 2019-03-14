const fs = require('fs');
const chai = require('chai');

const { expect } = chai;

const aws = require('aws-sdk');

const awsAttachments = require('../lib/awsAttachments');

describe('Aws attachment', function () {
  this.timeout(10000);

  const testFilePath = 'spec-integration/';
  const filename = 'someTestFile.txt';

  before(async () => {
    if (fs.existsSync('.env')) {
      require('dotenv').config();
    }

    fs.appendFile(testFilePath + filename, 'Some content. \n with two lines', function (err) {
      if (err) throw err;
      console.log('Created test file!');
    });
  });

  it('adding attachment', async () => {
    const stream = fs.createReadStream(testFilePath + filename);
    const result = await awsAttachments.addAttachment({}, filename, stream, 1215);
    expect(Object.keys(result.attachments)[0]).to.eql(filename);
  });

  after(async () => {
    fs.unlink(testFilePath + filename, function (err) {
      if (err) throw err;
      console.log('Removed test file!');
    });

    const s3 = new aws.S3({
      accessKeyId: process.env.ACCESS_KEY_ID,
      secretAccessKey: process.env.ACCESS_KEY_SECRET,
      region: 'eu-central-1',
    });
    const params = {  Bucket: process.env.AWS_BUCKET_NAME, Key: filename };
    await s3.deleteObject(params).promise();

    console.log('Removed test file from AWS S3 storage!');
  });
});
