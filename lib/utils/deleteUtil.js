const { DeleteById } = require('@elastic.io/oih-standard-library/lib/actions/delete');

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
    const dir = cfg.directory.substring(cfg.directory.length - 1) === '/'
      ? cfg.directory.substring(0, cfg.directory.length - 1)
      : cfg.directory;

    const fullFilenameToDelete = `${dir}/${filename}`;
    this.logger.info(`Deleting file by name: ${fullFilenameToDelete}`);
    await this.client.delete(fullFilenameToDelete);
    return filename;
  }
}

exports.SftpDelete = SftpDelete;
