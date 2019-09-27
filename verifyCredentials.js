const { Logger } = require('@elastic.io/component-commons-library');
const Sftp = require('./lib/Sftp');

module.exports = async function verify(cfg, cb) {
  const logger = Logger.getLogger();
  try {
    const sftp = new Sftp(logger, cfg);
    await sftp.connect();
    await sftp.end();
    logger.info('SFTP verified');
    return cb(null, { verified: true });
  } catch (err) {
    logger.error(err);
    return cb(err, { verified: false });
  }
};
