const sftp = require('./lib/sftp.js');

function verify(cfg, cb) {
  sftp.connect(cfg, (err, client) => {
    if (err) {
      cb(err, { verified: false });
      return { verified: false };
    }

    sftp.close(client);
    cb(null, { verified: true });
    return { verified: true };
  });
}

module.exports = verify;
