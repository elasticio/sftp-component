const AND_OR_3 = {
  directoryPath: '/www/nick/test',
  searchTerm0: {
    fieldName: 'name',
    condition: 'eq',
    fieldValue: '123.json_1558428893007',
  },
  criteriaLink0: 'and',
  searchTerm1: {
    fieldName: 'size',
    condition: 'eq',
    fieldValue: '2984',
  },
  criteriaLink1: 'or',

  searchTerm2: {
    fieldName: 'name',
    condition: 'eq',
    fieldValue: '123.json_1558460387824',
  },
  criteriaLink2: 'and',
  searchTerm3: {
    fieldName: 'size',
    condition: 'eq',
    fieldValue: 'string 2984',
  },
  criteriaLink3: 'or',

  searchTerm4: {
    fieldName: 'name',
    condition: 'eq',
    fieldValue: '123.json_1558460387824',
  },
  criteriaLink4: 'and',
  searchTerm5: {
    fieldName: 'size',
    condition: 'eq',
    fieldValue: 'string 2984',
  },
};
const AND = {
  directoryPath: '/www/nick/test',
  searchTerm0: {
    fieldName: 'name',
    condition: 'like',
    fieldValue: '123.json_1558428893007',
  },
  criteriaLink0: 'and',
  searchTerm1: {
    fieldName: 'size',
    condition: 'like',
    fieldValue: '*',
  },
  criteriaLink1: 'and',
  searchTerm2: {
    fieldName: 'name',
    condition: 'like',
    fieldValue: '123.*',
  },
  criteriaLink2: 'and',
  searchTerm3: {
    fieldName: 'size',
    condition: 'eq',
    fieldValue: '2984',
  },
};

const AND2 = {
  directoryPath: '/www/nick/test',
  searchTerm0: {
    fieldName: 'name',
    condition: 'like',
    fieldValue: '123.json_1558428893007',
  },
  criteriaLink0: 'or',
  searchTerm1: {
    fieldName: 'size',
    condition: 'like',
    fieldValue: '*',
  },
  criteriaLink1: 'and',
  searchTerm2: {
    fieldName: 'name',
    condition: 'like',
    fieldValue: '123.*',
  },
  criteriaLink2: 'or',
  searchTerm3: {
    fieldName: 'size',
    condition: 'eq',
    fieldValue: '2984',
  },
};

const GT_LT = {
  directoryPath: '/www/nick/test',
  searchTerm0: {
    fieldName: 'name',
    condition: 'like',
    fieldValue: '123.json_1558428893007',
  },
  criteriaLink0: 'or',
  searchTerm1: {
    fieldName: 'size',
    condition: 'gt',
    fieldValue: '1',
  },
  criteriaLink1: 'and',
  searchTerm2: {
    fieldName: 'name',
    condition: 'like',
    fieldValue: '123.*',
  },
  criteriaLink2: 'or',
  searchTerm3: {
    fieldName: 'size',
    condition: 'lt',
    fieldValue: '2984',
  },
};

const GTE_LTE_TRUE = {
  directoryPath: '/www/nick/test',
  searchTerm0: {
    fieldName: 'name',
    condition: 'like',
    fieldValue: '123.json_1558428893007',
  },
  criteriaLink0: 'or',
  searchTerm1: {
    fieldName: 'size',
    condition: 'gte',
    fieldValue: '2984',
  },
  criteriaLink1: 'and',
  searchTerm2: {
    fieldName: 'name',
    condition: 'like',
    fieldValue: '123.*',
  },
  criteriaLink2: 'or',
  searchTerm3: {
    fieldName: 'size',
    condition: 'lte',
    fieldValue: '2984',
  },
};

const GTE_LTE_FALSE = {
  directoryPath: '/www/nick/test',
  searchTerm0: {
    fieldName: 'size',
    condition: 'gte',
    fieldValue: '2985',
  },
  criteriaLink0: 'or',
  searchTerm1: {
    fieldName: 'size',
    condition: 'lte',
    fieldValue: '2983',
  },
};

const DATES = {
  directoryPath: '/www/nick/test',
  searchTerm0: {
    fieldName: 'modifyTime',
    condition: 'gte',
    fieldValue: '2019-12-05T15:18:38.000Z',
  },
  criteriaLink0: 'or',
  searchTerm1: {
    fieldName: 'accessTime',
    condition: 'gte',
    fieldValue: '2019-12-05T15:18:38.000Z',
  },
};

const ITEMS = [
  {
    type: '-',
    name: '123.json_1558428893007',
    size: 2984,
    modifyTime: 1574930817000,
    accessTime: 1574930817000,
    rights: { user: 'rw', group: 'r', other: '' },
    owner: 1002,
    group: 1002,
  }, {
    type: '-',
    name: '123.json_1558460387824',
    size: 2984,
    modifyTime: 1558427618000,
    accessTime: 1558459105000,
    rights: { user: 'rw', group: 'rw', other: 'rw' },
    owner: 1002,
    group: 1002,
  }, {
    type: '-',
    name: 'AppDirect-Component-soapui-project.xml_1558434478480',
    size: 11153,
    modifyTime: 1574930817000,
    accessTime: 1574930817000,
    rights: { user: 'rw', group: 'r', other: '' },
    owner: 1002,
    group: 1002,
  }, {
    type: '-',
    name: 'input.csv_1561644017175',
    size: 252,
    modifyTime: 1574930817000,
    accessTime: 1574930817000,
    rights: { user: 'rw', group: 'r', other: 'r' },
    owner: 1002,
    group: 1002,
  }, {
    type: '-',
    name: 'input.csv_1561637935511',
    size: 246,
    modifyTime: 1574930817000,
    accessTime: 1574930817000,
    rights: { user: 'rw', group: 'r', other: 'r' },
    owner: 1002,
    group: 1002,
  }, {
    type: '-',
    name: 'weather.xml_1558437605646',
    size: 416,
    modifyTime: 1574930816000,
    accessTime: 1574930816000,
    rights: { user: 'rw', group: 'r', other: 'r' },
    owner: 1002,
    group: 1002,
  }, {
    type: '-',
    name: 'weather.xml_1558439660630',
    size: 416,
    modifyTime: 1574930816000,
    accessTime: 1574930816000,
    rights: { user: 'rw', group: 'r', other: 'r' },
    owner: 1002,
    group: 1002,
  },
  {
    type: '-',
    name: 'input.csv',
    size: 322,
    modifyTime: 1561642914000,
    accessTime: 1561642913000,
    rights: { user: 'rw', group: 'r', other: 'r' },
    owner: 1002,
    group: 1002,
  },
  {
    type: '-',
    name: '123.json',
    size: 2984,
    modifyTime: 1574930817000,
    accessTime: 1574930817000,
    rights: { user: 'rw', group: 'r', other: '' },
    owner: 1002,
    group: 1002,
  },
  {
    type: '-',
    name: 'input.csv_1561641033491',
    size: 252,
    modifyTime: 1574930817000,
    accessTime: 1574930817000,
    rights: { user: 'rw', group: 'r', other: 'r' },
    owner: 1002,
    group: 1002,
  },
  {
    type: '-',
    name: 'weather.xml_1558437489608',
    size: 416,
    modifyTime: 1574930817000,
    accessTime: 1574930816000,
    rights: { user: 'rw', group: 'r', other: 'r' },
    owner: 1002,
    group: 1002,
  },
  {
    type: '-',
    name: 'AppDirect-Component-soapui-project.xml_1558460424764',
    size: 11153,
    modifyTime: 1558433197000,
    accessTime: 1558459142000,
    rights: { user: 'rw', group: 'rw', other: 'rw' },
    owner: 1002,
    group: 1002,
  },
  {
    type: '-',
    name: 'input.csv_1561639050114',
    size: 252,
    modifyTime: 1574930817000,
    accessTime: 1574930817000,
    rights: { user: 'rw', group: 'r', other: 'r' },
    owner: 1002,
    group: 1002,
  },
  {
    type: '-',
    name: 'input.csv_1561644403406',
    size: 322,
    modifyTime: 1574930817000,
    accessTime: 1574930817000,
    rights: { user: 'rw', group: 'r', other: 'r' },
    owner: 1002,
    group: 1002,
  },
];

module.exports = {
  AND_OR_3,
  AND,
  AND2,
  GT_LT,
  GTE_LTE_FALSE,
  GTE_LTE_TRUE,
  DATES,
  ITEMS,
};
