import Sftp from './src/Sftp';

async function verifyCredentials(cfg) {
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
}

export { verifyCredentials as verify };
