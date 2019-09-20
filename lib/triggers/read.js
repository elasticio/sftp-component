const _ = require('lodash');
const async = require('async');
const { messages } = require('elasticio-node');
const sftp = require('../sftp.js');
const attachments = require('../attachments.js');

const PROCESSED_FOLDER_NAME = '.elasticio_processed';
const MAX_FILE_SIZE = 104857600; // 100 MiB

function readDirContent(client, handle, result, cb) {
  client.readdir(handle, (err, list) => {
    if (err) {
      return cb(err);
    }

    _.each(list, (entry) => {
      result.push(entry);
    });

    return cb(null);
  });
}

function readDir(client, handle, cb) {
  const result = [];

  readDirContent(client, handle, result, (err) => {
    if (err) {
      return cb(err);
    }

    return cb(null, result);
  });
}

function isDirectory(obj) {
  const { longname } = obj;

  return longname.charAt(0) === 'd';
}

function doesProcessedFolderExist(files) {
  const result = _.find(
    files,
    (current) => current.filename === PROCESSED_FOLDER_NAME && isDirectory(current),
  );

  return !_.isUndefined(result);
}

function filterFileNames(files, cfg) {
  const pattern = cfg.pattern || '';

  const regExp = new RegExp(pattern);

  return _.filter(files, (file) => regExp.test(file.filename));
}

function resolveFiles(files, cfg) {
  const candidates = _.filter(files, (current) => {
    const { attrs } = current;

    if (isDirectory(current)) {
      return false;
    } if (attrs.size > MAX_FILE_SIZE) {
      return false;
    }
    return true;
  });
  return filterFileNames(candidates, cfg);
}

function createProcessedFolder(client, dir, processedFolderExist, cb) {
  if (processedFolderExist) {
    return cb();
  }

  const path = sftp.createPath(dir, PROCESSED_FOLDER_NAME);

  return client.mkdir(path, {
    mode: 16877,
  }, cb);
}

function move(client, dir, file, processedFolderExist, cb) {
  const fileName = file.filename;

  const oldName = sftp.createPath(dir, fileName);
  const newName = sftp.createPath(dir, `${PROCESSED_FOLDER_NAME}/${fileName}_${new Date().getTime()}`);

  createProcessedFolder(client, dir, processedFolderExist, (err) => {
    if (err) {
      return cb(err);
    }

    return client.rename(oldName, newName, (err2) => {
      cb(err2, newName);
    });
  });
}

function createMessageForFile(client, dir, file, processedFolderExist, cb) {
  const fileName = file.filename;

  const msg = messages.newMessageWithBody({
    filename: file.filename,
    size: file.attrs.size,
  });

  move(client, dir, file, processedFolderExist, (err, newPath) => {
    if (err) {
      return cb(err);
    }

    const readStream = client.createReadStream(newPath);

    return attachments.addAttachment(msg, fileName, readStream, file.attrs.size)
      .then(() => {
        cb(null, msg);
      });
  });
}

function createReaders(client, dir, files, processedFolderExist, emitter) {
  if (!files || _.isEmpty(files)) {
    return [(cb) => {
      cb();
    }];
  }
  return _.map(files, (file) => (cb) => {
    createMessageForFile(client, dir, file, processedFolderExist, (err, msg) => {
      if (err) {
        return cb(err);
      }

      emitter.emit('data', msg);
      const result = msg ? file : null;
      return cb(null, result);
    });
  });
}

exports.process = function process(msg, cfg) {
  const self = this;

  function onError(e) {
    self.emit('error', e);
  }

  function onEnd() {
    self.emit('end');
  }

  function errorAndEnd(e) {
    onError(e);
    onEnd();
  }

  sftp.connect(cfg, (err, client) => {
    if (err) {
      return errorAndEnd(err);
    }

    let dir = cfg.directory || '/';

    if (dir.charAt(0) !== '/') {
      dir = `/${dir}`;
    }

    return client.opendir(dir, (err2, handle) => {
      if (err2) {
        sftp.close(client, handle);
        return errorAndEnd(err2);
      }
      return readDir(client, dir, (err3, list) => {
        if (err3) {
          sftp.close(client, handle);
          return errorAndEnd(err3);
        }
        try {
          const files = resolveFiles(list, cfg);
          const processedFolderExist = doesProcessedFolderExist(list);
          const functions = createReaders(client, dir, files, processedFolderExist, self);

          return async.series(functions,
            () => {
              sftp.close(client, handle);
              onEnd();
            });
        } catch (e) {
          sftp.close(client, handle);
          return errorAndEnd(e);
        }
      });
    });
  });
};
