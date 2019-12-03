const micromatch = require('micromatch');
const moment = require('moment');

const CONDITIONS_LIST = ['like', 'eq', 'ne', 'gt', 'gte', 'lt', 'lte'];

class ConditionResolver {
  constructor(logger) {
    this.logger = logger;
  }

  processCondition(searchTerm, item, properties = { dateFields: [] }) {
    const { fieldName, condition, fieldValue } = searchTerm;
    if (item[fieldName] === undefined){
      throw new Error(`Can not find field: ${fieldName}`);
    }
    function checkAndCastIfDate() {
      if (properties.dateFields.includes(fieldName)) {
        return moment(fieldValue, moment.ISO_8601, true).unix();
      }
      return fieldValue;
    }

    switch (condition) {
      case 'like':
        return micromatch.isMatch(item[fieldName].toString(), fieldValue);
      case 'eq':
        // eslint-disable-next-line eqeqeq
        return item[fieldName] == checkAndCastIfDate();
      case 'ne':
        // eslint-disable-next-line eqeqeq
        return item[fieldName] != checkAndCastIfDate();
      case 'gt':
        return item[fieldName] > checkAndCastIfDate();
      case 'gte':
        return item[fieldName] >= checkAndCastIfDate();
      case 'lt':
        return item[fieldName] < checkAndCastIfDate();
      case 'lte':
        return item[fieldName] <= checkAndCastIfDate();
      default:
        throw new Error(`Unknown condition: ${condition}. Available operators: ${CONDITIONS_LIST} `);
    }
  }

  processConditions(msg, item) {
    const conditionCnt = Object.keys(msg).filter((key) => key.includes('searchTerm')).length;
    if (conditionCnt === 0) return true;
    const ors = [
      conditionCnt - 1,
      ...Object.keys(msg)
        .filter((key) => key.includes('criteriaLink') && msg[key] === 'or')
        .map((or) => Number(or.replace('criteriaLink', '')))].sort().reverse();
    this.logger.debug('Or conditions: %j', ors);
    const orPartsResults = [];
    ors.forEach((or, j) => {
      const from = or;
      const to = ors[j + 1] !== undefined ? ors[j + 1] : -1;
      const andResult = [];
      this.logger.debug(`From :${from}, to: ${to}`);
      for (let i = from; i > to; i--) {
        this.logger.debug('Processing condition: %j', msg[`searchTerm${i}`]);
        andResult.push(this.processCondition(msg[`searchTerm${i}`], item));
      }
      orPartsResults.push(andResult.every((p) => p));
    });
    this.logger.debug('Conditions: %j', orPartsResults);
    return orPartsResults.some((part) => part);
  }
}


module.exports.CONDITIONS_LIST = CONDITIONS_LIST;
module.exports.ConditionResolver = ConditionResolver;
