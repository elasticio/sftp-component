const { messages } = require('elasticio-node');
const { Readable } = require('stream');
const { LookupObjectById } = require('@elastic.io/oih-standard-library/lib/actions/lookupObject');
const Sftp = require('../Sftp');
const attachments = require('../attachments');

class SftpLookupObject extends LookupObjectById {
  constructor(logger, client) {
    super(logger);
    this.client = client;
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  getId(msg, cfg) {
    return msg.body.filename;
  }

  // eslint-disable-next-line no-unused-vars
  async lookupObject(filename, objectType, cfg, msg) {
    const { directory } = cfg;
    const dir = directory.substring(directory.length - 1) === '/'
      ? directory.substring(0, directory.length - 1)
      : directory;

    const fullFilename = `${dir}/${filename}`;
    this.logger.info(`Lookup file by name: ${fullFilename}`);
    const [file] = await this.client.list(dir, filename);
    const fileName = file.name;

    const result = messages.newMessageWithBody({
      filename: fileName,
      size: file.size,
    });

    this.logger.info(`Reading ${fileName} into read stream`);
    const buffer = await this.client.get(Sftp.createPath(dir, fileName));
    const readStream = new Readable();
    readStream.push(buffer);
    readStream.push(null);
    await attachments.addAttachment.call(this, result, fileName, readStream, file.size);

    await this.client.end();
    return result;
  }
}

exports.SftpLookupObject = SftpLookupObject;
