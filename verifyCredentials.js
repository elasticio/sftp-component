const sftp = require('./lib/sftp.js');

function verify(cfg, cb) {
  console.log('Verifying the SFTP account');

  sftp.connect(cfg, (err, client) => {
    if (err) {
      return cb(err);
    }

    sftp.close(client);

    cb(null, { verified: true });

    console.log('SFTP account verified successfully');
  });
}

module.exports = verify;
