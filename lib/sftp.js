'use-strict';

const Connection = require('ssh2');
const util = require('util');
const ip = require('./ip.js');
const Q = require('q');

function createConnectionOptions(cfg) {
    const host = cfg.host.trim();

    let port = cfg.port;

    if (port !== '' && !isNaN(port)) {
        port = parseInt(port);
    }


    return ip.resolve(host).then((address) => {

        console.log(host, 'successfully resolved to', address);

        const options = {
            host: host,
            port: port,
            username: cfg.username,
            password: cfg.password
        };

        return Q.fcall(() => options);
    });
}

exports.close = function close(sftp, handle) {
    if (!handle) {
        return sftp.end();
    }

    sftp.close(handle, (err) => {
        if (err) {throw err;}

        console.log('SFTP :: Handle closed');

        sftp.end();
    });
};

exports.readFile = function readFile(client, path, cb) {

    let readStream = client.createReadStream(path);

    let chunks = [];

    readStream.on('data', (chunk) => {
        chunks.push(chunk);
    });

    readStream.on('end', () => {
        const buffer = Buffer.concat(chunks);

        cb(null, buffer);
    });
};

exports.createPath = function createPath(dir, file) {

    let slash = '';

    if (dir.charAt(dir.length - 1) !== '/') {
        slash = '/';
    }

    return dir + slash + file;
};

function getConnectionString(opts) {
    return util.format('%s@%s:%s', opts.username, opts.host, opts.port);
}

exports.connect = (cfg, cb) => {

    createConnectionOptions(cfg)
        .then((opts) => {

            function onConnect() {
                console.log('Connected to: %s', getConnectionString(opts));
            }

            function onReady() {
                console.log('Connection ready: %s', getConnectionString(opts));

                c.sftp((err, sftp) => {
                    if (err) {
                        return cb(err);
                    }
                    console.log('SFTP session ready: %s', getConnectionString(opts));

                    sftp.on('end',() => {
                        console.log('SFTP session closed: %s', getConnectionString(opts));
                        c.end();
                    });

                    cb(null, sftp);
                });
            }

            function onError(err) {
                console.log('Connection :: error :: ' + err.stack);
                cb(err);
            }

            function onEnd() {
                console.log('Connection end: %s', getConnectionString(opts));
            }

            function onClose() {
                console.log('Connection closed: %s', getConnectionString(opts));
            }

            let c = new Connection();

            c.on('connect', onConnect);

            c.on('ready', onReady);
            c.on('error', onError);

            c.on('end', onEnd);

            c.on('close', onClose);

            c.connect(opts);
        })
        .catch((e) => {
            cb(e);
        }).done();
};

exports.createConnectionOptions = createConnectionOptions;
