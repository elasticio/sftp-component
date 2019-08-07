'use strict';
const sftp = require('./lib/sftp.js');

function verify(cfg, cb) {

    this.logger.info('Verifying the SFTP account');

    sftp.connect(cfg, (err, client) => {

        if (err) {
            return cb(err);
        }

        sftp.close(client);

        cb(null, {
            verified: true
        });

        this.logger.info('SFTP account verified successfully');
    });

}

module.exports = verify;
