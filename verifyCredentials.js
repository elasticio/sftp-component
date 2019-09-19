const sftp = require('./lib/sftp.js');

function verify(cfg, cb) {
  console.log('Verifying the SFTP account');

  sftp.connect(cfg, (err, client) => {
    if (err) {
      cb(err, { verified: false });
      return { verified: false };
    }

    sftp.close(client);
    cb(null, { verified: true });
    console.log('SFTP account verified successfully');
    return { verified: true };
  });
}

module.exports = verify;
