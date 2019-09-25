const Connection = require('ssh2');
const ip = require('./ip.js');

async function createConnectionOptions(cfg) {
  const host = cfg.host.trim();
  const port = parseInt(cfg.port, 10) || 22;

  await ip.resolve(host);
  return {
    host,
    port,
    username: cfg.username,
    password: cfg.password,
  };
}

exports.close = function close(sftp, handle) {
  if (!handle) {
    return sftp.end();
  }

  return sftp.close(handle, (err) => {
    if (err) { throw err; }

    sftp.end();
  });
};

exports.createPath = function createPath(dir, file) {
  let slash = '';

  if (dir.charAt(dir.length - 1) !== '/') {
    slash = '/';
  }

  return dir + slash + file;
};

exports.connect = (cfg, cb) => {
  try {
    const opts = createConnectionOptions(cfg);
    const c = new Connection();

    c.on('ready', () => {
      c.sftp((err, sftp) => {
        if (err) {
          return cb(err);
        }
        sftp.on('end', () => {
          c.end();
        });

        return cb(null, sftp);
      });
    });

    c.on('error', (err) => {
      cb(err);
    });

    c.connect(opts);
  } catch (err) {
    cb(err);
  }
};

exports.createConnectionOptions = createConnectionOptions;
