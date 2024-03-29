/* eslint-disable no-param-reassign */
const moment = require('moment');
const path = require('path');
const packageJson = require('../../package.json');
const compJson = require('../../component.json');

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

const getUserAgent = () => {
  const { name: compName } = packageJson;
  const { version: compVersion } = compJson;
  const compCommonsLibVersion = packageJson.dependencies['@elastic.io/component-commons-library'];
  return `${compName}/${compVersion} component-commons-library/${compCommonsLibVersion}`;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const timeOut = async (t, resetToken) => {
  const sleepToken = (ms, token) => new Promise((resolve) => {
    let timeout = setTimeout(resolve, ms);
    token.reset = () => {
      clearTimeout(timeout);
      timeout = setTimeout(resolve, ms);
    };
  });
  await sleepToken(t, resetToken);
  throw new Error(`time out ${t}ms limit reached`);
};

function fillOutputBody(body, dir) {
  body.directory = dir;
  body.path = path.join(dir, body.name);
  body.modifyTime = unixTimeToIsoDate(body.modifyTime);
  body.accessTime = unixTimeToIsoDate(body.accessTime);
  return body;
}

exports.fillOutputBody = fillOutputBody;
exports.getDirectory = getDirectory;
exports.getUserAgent = getUserAgent;
exports.isNumberInInterval = isNumberInInterval;
exports.sleep = sleep;
exports.timeOut = timeOut;
exports.unixTimeToIsoDate = unixTimeToIsoDate;
