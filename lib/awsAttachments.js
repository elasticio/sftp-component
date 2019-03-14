const aws = require('aws-sdk');
const debug = require('debug')('AWS-Client');

async function createAwsAttachment(msg, name, body, size) {
  const awsBucket = process.env.AWS_BUCKET_NAME;
  const urlExpirationTime = process.env.AWS_URL_EXPIRATION_TIME ? process.env.AWS_URL_EXPIRATION_TIME : 600;

  const s3 = new aws.S3({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.ACCESS_KEY_SECRET,
    region: 'eu-central-1',
  });

  const s3Input = {
    Bucket: awsBucket,
    Key: name,
    Body: body,
  };

  await s3.upload(s3Input).promise();

  const params = { Bucket: awsBucket, Key: name, Expires: urlExpirationTime };
  const url = s3.getSignedUrl('getObject', params);
  debug('Received attachment url: %s', url);

  if (!msg.attachments) {
    msg.attachments = {};
  }
  msg.attachments[name] = {
    url: url,
    size: size,
  };

  return msg;
}

exports.addAttachment = createAwsAttachment;
