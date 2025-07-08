/* eslint-disable eqeqeq */
import path from 'path';
import { Transform } from 'node:stream';
import micromatch from 'micromatch';
import packageJson from '../../package.json';
import compJson from '../../component.json';

export const unixTimeToIsoDate = (unixTime) => new Date(Number(unixTime)).toISOString();
export const isNumberInInterval = (num, min, max) => !(Number.isNaN(num) || num < min || num > max);
export const timestamp = (date) => new Date(date).getTime();
export const getBiggestDate = (dates) => dates.reduce((a, b) => (timestamp(a) > timestamp(b) ? a : b));
export const normalizeDirectoryName = (dir) => (dir.startsWith('/') ? path.posix.resolve(dir) : path.posix.resolve('/', dir));
export const getDirectoryFromPath = (fullPath) => path.posix.dirname(fullPath);
export const getFileNameFromPath = (fullPath) => path.posix.basename(fullPath);
export const getFileCorrectPath = (directory, fileName) => path.posix.join(directory, fileName);

export const streamToBuffer = (stream: Transform): Promise<Buffer> => new Promise((resolve, reject) => {
  const chunks = [];
  stream.on('data', (chunk) => chunks.push(chunk));
  stream.on('end', () => resolve(Buffer.concat(chunks)));
  stream.on('error', reject);
});

export const getTermNumber = (cfg) => {
  const termNumber = cfg.numSearchTerms ? parseInt(cfg.numSearchTerms, 10) : 0;
  if (!isNumberInInterval(termNumber, 0, 99)) throw new Error('Number of search terms must be an integer value from the interval [0-99]');
  return termNumber;
};

export const lookupPluralOperators = {
  eq: (a, b) => a == b,
  ne: (a, b) => a != b,
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b
};

export const lookupPluralConditionsMatch = (body, item, logger) => {
  const itemConditionMatch = (searchTerm) => {
    const { fieldName, condition, fieldValue } = searchTerm;
    const actualValue = item[fieldName];
    if (actualValue === undefined) throw new Error(`Can not find field: ${fieldName}`);
    const castValue = ['modifyTime', 'accessTime'].includes(fieldName) ? new Date(fieldValue).getTime() : fieldValue;
    if (condition === 'like') return micromatch.isMatch(String(actualValue), fieldValue, undefined);
    if (lookupPluralOperators[condition]) return lookupPluralOperators[condition](actualValue, castValue);
    throw new Error(`Unknown condition: ${condition}`);
  };

  const conditionCnt = Object.keys(body).filter((key) => key.includes('searchTerm')).length;
  if (conditionCnt === 0) return true;
  const ors = [
    conditionCnt - 1,
    ...Object.keys(body)
      .filter((key) => key.includes('criteriaLink') && body[key] === 'or')
      .map((or) => Number(or.replace('criteriaLink', '')))
  ].sort((a, b) => b - a);

  logger.debug(`Or conditions: ${ors}`);
  const orResults = ors.map((from, idx) => {
    const to = ors[idx + 1] !== undefined ? ors[idx + 1] : -1;
    logger.debug(`From :${from}, to: ${to}`);

    const andResults: any[] = [];
    for (let i = from; i > to; i--) {
      logger.debug(`Processing condition ${i}: ${JSON.stringify(body[`searchTerm${i}`])}`);
      andResults.push(itemConditionMatch(body[`searchTerm${i}`]));
    }
    return andResults.every(Boolean);
  });
  logger.debug(`Conditions: ${orResults}`);
  return orResults.some(Boolean);
};

export const prepareUploadFilename = (msg) => {
  if (msg.body.filename) {
    if (Object.keys(msg.attachments).length > 1) {
      return msg.body.filename.split('.')[0];
    }
    return msg.body.filename;
  }
  return null;
};

export const prepareUploadKeyname = (key, filename, msg) => {
  if (filename) {
    if (Object.keys(msg.attachments).length > 1) {
      return `${filename}_${key}`;
    }
    return filename;
  }
  return key;
};

export const getUserAgent = () => {
  const { name: compName } = packageJson;
  const { version: compVersion } = compJson;
  const compCommonsLibVersion = packageJson.dependencies['@elastic.io/component-commons-library'];
  return `${compName}/${compVersion} component-commons-library/${compCommonsLibVersion}`;
};

export const formatFile = (file, directory) => {
  const fileCorrectPath = getFileCorrectPath(directory, file.name);
  return {
    ...file,
    directory,
    path: fileCorrectPath,
    modifyTime: unixTimeToIsoDate(file.modifyTime),
    accessTime: unixTimeToIsoDate(file.accessTime)
  };
};
