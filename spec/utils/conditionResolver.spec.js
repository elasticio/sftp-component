const { expect } = require('chai');
const componentLogger = require('@elastic.io/component-logger')();
require('dotenv').config();
const {
  AND_OR_3, AND, AND2, GT_LT, GTE_LTE_TRUE, GTE_LTE_FALSE, ITEMS, DATES,
} = require('./examples');
const { ConditionResolver } = require('../../lib/utils/conditionResolver');

const conditionResolver = new ConditionResolver(componentLogger);

describe('Resolve Condition', () => {
  it('AND_OR_3', () => {
    const res = conditionResolver.processConditions(AND_OR_3, ITEMS[0]);
    expect(res).to.be.true;
  });
  it('AND', () => {
    const res = conditionResolver.processConditions(AND, ITEMS[0]);
    expect(res).to.be.true;
  });
  it('AND2', () => {
    const res = conditionResolver.processConditions(AND2, ITEMS[0]);
    expect(res).to.be.true;
  });

  it('GT_LT', () => {
    const res = conditionResolver.processConditions(GT_LT, ITEMS[0]);
    expect(res).to.be.true;
  });

  it('GTE_LTE_TRUE', () => {
    const res = conditionResolver.processConditions(GTE_LTE_TRUE, ITEMS[0]);
    expect(res).to.be.true;
  });

  it('GTE_LTE_FALSE', () => {
    const res = conditionResolver.processConditions(GTE_LTE_FALSE, ITEMS[0]);
    expect(res).to.be.false;
  });

  it('DATES', () => {
    const res = conditionResolver.processConditions(DATES, ITEMS[0], { dateFields: ['modifyTime', 'accessTime'] });
    expect(res).to.be.false;
  });
});
