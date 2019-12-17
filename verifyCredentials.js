const Sftp = require('./lib/Sftp');

module.exports = async function verify(cfg, cb) {
  try {
    const { password, privateKey } = cfg;
    if (password && privateKey) {
      throw new Error('Both: password and private key fields are filled, use only one option');
    } else if (!password && !privateKey) {
      throw new Error('Both: password and private key fields are empty, use only one option');
    }
    const sftp = new Sftp(this.logger, cfg);
    await sftp.connect();
    await sftp.end();
    this.logger.info('SFTP verified');
    return cb(null, { verified: true });
  } catch (err) {
    this.logger.error('SFTP failed to verify');
    this.logger.error(err);
    return cb(err, { verified: false });
  }
};
