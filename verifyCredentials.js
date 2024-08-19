const Sftp = require('./lib/Sftp');

module.exports = async function verifyCredentials(cfg) {
  const { password, privateKey } = cfg;
  if (password && privateKey) {
    throw new Error('Both: password and private key fields are filled, use only one option');
  } else if (!password && !privateKey) {
    throw new Error('Both: password and private key fields are empty, use only one option');
  }
  const sftp = new Sftp(this.logger, cfg);
  try {
    await sftp.connect();
    await sftp.end();
    this.logger.info('SFTP credentials successfully verified');
    return { verified: true };
  } catch (error) {
    this.logger.error(error.message);
    this.logger.error('SFTP credentials verification failed');
    return { verified: false };
  }
};
