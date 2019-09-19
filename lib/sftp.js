const Connection = require('ssh2');
const util = require('util');
const Q = require('q');
const ip = require('./ip.js');

function createConnectionOptions(cfg) {
  const host = cfg.host.trim();
  const port = parseInt(cfg.port, 10);

  return ip.resolve(host).then((address) => {
    console.log(host, 'successfully resolved to', address);

    const options = {
      host,
      port,
      username: cfg.username,
      password: cfg.password,
    };

    return Q.fcall(() => options);
  });
}

exports.close = function close(sftp, handle) {
  if (!handle) {
    return sftp.end();
  }

  return sftp.close(handle, (err) => {
    if (err) { throw err; }

    console.log('SFTP :: Handle closed');

    sftp.end();
  });
};

exports.readFile = function readFile(client, path, cb) {
  const readStream = client.createReadStream(path);

  const chunks = [];

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
      const c = new Connection();
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

          sftp.on('end', () => {
            console.log('SFTP session closed: %s', getConnectionString(opts));
            c.end();
          });

          return cb(null, sftp);
        });
      }

      function onError(err) {
        console.log(`Connection :: error :: ${err.stack}`);
        cb(err);
      }

      function onEnd() {
        console.log('Connection end: %s', getConnectionString(opts));
      }

      function onClose() {
        console.log('Connection closed: %s', getConnectionString(opts));
      }

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
