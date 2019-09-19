const _ = require('lodash');
const async = require('async');
const { messages } = require('elasticio-node');
const sftp = require('../sftp.js');
const attachments = require('../attachments.js');

const PROCESSED_FOLDER_NAME = '.elasticio_processed';
const MAX_FILE_SIZE = 104857600; // 100 MiB

function logProcessedFiled(results) {
  const fileNames = _.map(results, (next) => (next ? next.filename : null));

  console.log('Processed files:', _.filter(fileNames, (next) => next));
}

function readDirContent(client, handle, result, cb) {
  client.readdir(handle, (err, list) => {
    if (err) {
      console.log('An error occurred reading a directory');
      console.log(err);
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
      console.log('An error occurred in readDir a directory');
      console.log(err);
      return cb(err);
    }

    cb(null, result);
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

  return _.filter(files, (file) => {
    const fileName = file.filename;

    const result = regExp.test(fileName);

    if (!result) {
      console.log('%s does not match pattern: \'%s\'', fileName, pattern);
    }
    return result;
  });
}

function resolveFiles(files, cfg) {
  const candidates = _.filter(files, (current) => {
    const { attrs } = current;

    if (isDirectory(current)) {
      return false;
    } if (attrs.size > MAX_FILE_SIZE) {
      console.log('WARNING FILE: %s will not be uploaded since it size=%s exceeds maximum size of %s',
        current.filename,
        attrs.size, MAX_FILE_SIZE);
      return false;
    }
    return true;
  });
  console.log('Candidates after filter candidates=%j', candidates);
  return filterFileNames(candidates, cfg);
}

function createProcessedFolder(client, dir, processedFolderExist, cb) {
  if (processedFolderExist) {
    return cb();
  }

  const path = sftp.createPath(dir, PROCESSED_FOLDER_NAME);

  console.log('\'%s\' does not exist. About to mkdir.', path);

  client.mkdir(path, {
    mode: 16877,
  }, cb);
}

function move(client, dir, file, processedFolderExist, cb) {
  const fileName = file.filename;

  const oldName = sftp.createPath(dir, fileName);
  const newName = sftp.createPath(dir, `${PROCESSED_FOLDER_NAME}/${fileName}_${new Date().getTime()}`);

  createProcessedFolder(client, dir, processedFolderExist, (err) => {
    if (err) {
      console.log('An error occurred creating the processed folder');
      console.log(err);
      return cb(err);
    }

    console.log('About to move %s to %s', oldName, newName);


    client.rename(oldName, newName, (err) => {
      if (err) {
        console.log('An error occurred renaming the file');
        console.log(err);
      }

      console.log('%s successfully moved to %s', oldName, newName);

      cb(err, newName);
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
      console.log('An error occurred moving the files.');
      console.log(err);
      return cb(err);
    }

    const readStream = client.createReadStream(newPath);

    attachments.addAttachment(msg, fileName, readStream, file.attrs.size)
      .then(() => {
        cb(null, msg);
      });
  });
}

function createReaders(client, dir, files, processedFolderExist, emitter) {
  if (!files || _.isEmpty(files)) {
    return [(cb) => {
      console.log('No files to read');
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

      cb(null, result);
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
      console.log('An error occurred connecting');
      console.log(err);
      return errorAndEnd(err);
    }

    let dir = cfg.directory || '/';

    if (dir.charAt(0) !== '/') {
      dir = `/${dir}`;
    }

    console.log('Opening dir: \'%s\'', dir);

    client.opendir(dir, (err, handle) => {
      if (err) {
        console.log('An error occurred opening the directory');
        console.log(err);
        sftp.close(client, handle);
        return errorAndEnd(err);
      }
      console.log('Opened dir: \'%s\'', dir);
      readDir(client, dir, (err, list) => {
        if (err) {
          sftp.close(client, handle);
          return errorAndEnd(err);
        }
        console.log('Found following files=%j', list.map((f) => f.filename));
        try {
          const files = resolveFiles(list, cfg);

          console.log('Files after filter=%j', files);

          const processedFolderExist = doesProcessedFolderExist(list);

          console.log('Processed folder exists?=%s', processedFolderExist);

          const functions = createReaders(client, dir, files, processedFolderExist, self);

          async.series(functions,
            (err, results) => {
              if (err) {
                console.log(err);
              }

              logProcessedFiled(results);

              sftp.close(client, handle);

              onEnd();
            });
        } catch (e) {
          console.log('An error occurred looking the directory');
          console.log(e);
          sftp.close(client, handle);
          return errorAndEnd(e);
        }
      });
    });
  });
};
