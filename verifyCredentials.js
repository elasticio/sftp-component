const Sftp = require('./lib/Sftp');

module.exports = function verify(cfg, cb) {
  return Promise.resolve().then(async () => {
    const { password, privateKey } = cfg;
    if (password && privateKey) {
      throw new Error('Both: password and private key fields are filled, use only one option');
    } else if (!password && !privateKey) {
      throw new Error('Both: password and private key fields are empty, use only one option');
    }
    const sftp = new Sftp(this.logger, cfg);
    await sftp.connect();
    await sftp.end();
    this.logger.info('SFTP credentials are verified');
    cb(null, { verified: true });
    return { verified: true };
  }).catch((err) => {
    this.logger.error('Error occurred');
    cb(err, { verified: false });
    return { verified: false };
  });
};
