const { DeleteById } = require('@elastic.io/oih-standard-library/lib/actions/delete');
const { getDirectory } = require('./utils');

class SftpDelete extends DeleteById {
  constructor(logger, client) {
    super(logger);
    this.client = client;
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  getId(msg, cfg) {
    return msg.body.filename;
  }

  async deleteObject(filename, cfg) {
    const dir = getDirectory(cfg);

    const fullFilenameToDelete = `${dir}/${filename}`;
    this.logger.info(`Deleting file by name: ${fullFilenameToDelete}`);
    await this.client.delete(fullFilenameToDelete);
    await this.client.end();
    return filename;
  }
}

exports.SftpDelete = SftpDelete;
