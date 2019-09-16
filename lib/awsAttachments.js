const aws = require('aws-sdk');
const debug = require('debug')('AWS-Client');

const { PassThrough } = require('stream');

async function createAwsAttachment(cfg, msg, name, body, size) {
  const awsBucket = cfg.awsBucket ? cfg.awsBucket : process.env.AWS_BUCKET_NAME;
  const urlExpirationTime = process.env.AWS_URL_EXPIRATION_TIME ? process.env.AWS_URL_EXPIRATION_TIME : 600;

  const s3 = new aws.S3({
    accessKeyId: cfg.accessKeyId ? cfg.accessKeyId : process.env.ACCESS_KEY_ID,
    secretAccessKey: cfg.secretAccessKey ? cfg.secretAccessKey : process.env.ACCESS_KEY_SECRET,
    region: 'eu-central-1',
  });

  const passThrough = new PassThrough();
  body.pipe(passThrough);

  const s3Input = {
    Bucket: awsBucket,
    Key: name,
    Body: passThrough,
    ContentType: 'application/octet-stream'
  };

  debug('Uploading %s file with %s size to %s bucket as %s...', s3Input.Key, s3Input.ContentLength, s3Input.Bucket, s3Input.ContentType)

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

  console.log(`Emit data ${JSON.stringify(msg)}`);
  return msg;
}

exports.addAttachment = createAwsAttachment;
