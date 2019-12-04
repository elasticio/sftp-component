const moment = require('moment');


function unixTimeToIsoDate(unixTime) {
  return moment.utc(unixTime, 'x', true).toISOString();
}

module.exports.unixTimeToIsoDate = unixTimeToIsoDate;
