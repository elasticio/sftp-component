const moment = require('moment');

function getDirectory(cfg) {
  const { directory } = cfg;
  return directory.substring(directory.length - 1) === '/'
    ? directory.substring(0, directory.length - 1)
    : directory;
}

function unixTimeToIsoDate(unixTime) {
  return moment.utc(unixTime, 'x', true).toISOString();
}

exports.getDirectory = getDirectory;
exports.unixTimeToIsoDate = unixTimeToIsoDate;
