const sftp = require('./lib/sftp.js');

module.exports = verify;

function verify(cfg, cb) {

    console.log('Verifying the SFTP account');

    sftp.connect(cfg, function (err, client) {

        if (err) {
            return cb(err);
        }

        sftp.close(client);

        cb(null, {
            verified: true
        });

        console.log('SFTP account verified successfully');
    });

}
