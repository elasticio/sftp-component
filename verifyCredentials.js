const Sftp = require('./lib/Sftp');

module.exports = async function verify(cfg, cb) {
  try {
    const sftp = new Sftp(this.logger, cfg);
    await sftp.connect();
    await sftp.end();
    this.logger.info('SFTP verified');
    return cb(null, { verified: true });
  } catch (err) {
    this.logger.error(err);
    return cb(err, { verified: false });
  }
};
