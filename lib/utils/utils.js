const moment = require('moment');
const Client = require('ssh2-sftp-client');

function getDirectory(cfg) {
  const { directory } = cfg;
  return directory.substring(directory.length - 1) === '/'
    ? directory.substring(0, directory.length - 1)
    : directory;
}

function unixTimeToIsoDate(unixTime) {
  return moment.utc(unixTime, 'x', true).toISOString();
}

function isNumberInInterval(num, min, max) {
  if (Number.isNaN(num) || num < min || num > max) {
    return false;
  }

  return true;
}

class ClientReadStream extends Client {
  getReadStream(remotePath) {
    return this.sftp.createReadStream(remotePath);
  }
}

exports.getDirectory = getDirectory;
exports.Client = ClientReadStream;
exports.unixTimeToIsoDate = unixTimeToIsoDate;
exports.isNumberInInterval = isNumberInInterval;
