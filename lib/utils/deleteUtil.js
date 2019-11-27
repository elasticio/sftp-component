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
    await this.client.delete(`${cfg.directory}/${filename}`);
    return filename;
  }
}

exports.SftpDelete = SftpDelete;
