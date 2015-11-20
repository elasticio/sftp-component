var Connection = require('ssh2');
var util = require("util");
var ip = require('./ip.js');
var Q = require('q');

exports.connect = function (cfg, cb) {

    createConnectionOptions(cfg)
        .then(function (opts) {

            function onConnect() {
                console.log('Connected to: %s', getConnectionString(opts));
            }

            function onReady() {
                console.log('Connection ready: %s', getConnectionString(opts));

                c.sftp(function (err, sftp) {
                    if (err) {
                        return cb(err);
                    }
                    console.log('SFTP session ready: %s', getConnectionString(opts));

                    sftp.on('end', function () {
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

            function onClose(had_error) {
                console.log('Connection closed: %s', getConnectionString(opts));
            }

            var c = new Connection();

            c.on('connect', onConnect);

            c.on('ready', onReady);
            c.on('error', onError);

            c.on('end', onEnd);

            c.on('close', onClose);

            c.connect(opts);
        })
        .catch(function (e) {
            cb(e);
        }).done();
};

const SFTP_PROTOCOL = "sftp://";

var createConnectionOptions = function (cfg) {
    var host = cfg.host.trim();

    var protocolIndex = host.indexOf(SFTP_PROTOCOL);

    if (protocolIndex === 0) {
        host = host.substring(SFTP_PROTOCOL.length);
    }

    var port = 22;

    var hostAndPort = host.split(':');

    if (hostAndPort.length > 1) {
        var portVal = hostAndPort[1];
        host = hostAndPort[0];

        if (portVal!== '' && !isNaN(portVal)) {
            port = parseInt(portVal);
        }
    }

    return ip.resolve(host).then(function (address) {

        console.log(host, "successfully resolved to", address);

        var options = {
            host: host,
            port: port,
            username: cfg.username,
            password: cfg.password
        };

        return Q.fcall(function () {
            return options;
        });
    });
};

exports.createConnectionOptions = createConnectionOptions;

exports.close = function (sftp, handle) {
    if (!handle) {
        return sftp.end();
    }

    sftp.close(handle, function (err) {
        if (err) throw err;

        console.log('SFTP :: Handle closed');

        sftp.end();
    });
};

exports.readFile = function (client, path, cb) {

    var readStream = client.createReadStream(path);

    var chunks = [];

    readStream.on('data', function (chunk) {
        chunks.push(chunk);
    });

    readStream.on('end', function () {
        var buffer = Buffer.concat(chunks);

        cb(null, buffer);
    });
};

exports.createPath = function (dir, file) {

    var slash = "";

    if (dir.charAt(dir.length - 1) !== '/') {
        slash = "/"
    }

    return dir + slash + file;
};

var getConnectionString = function (opts) {
    return util.format("%s@%s:%s", opts.username, opts.host, opts.port);
};