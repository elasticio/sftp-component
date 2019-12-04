const lookupObject = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
    },
    name: {
      type: 'string',
    },
    size: {
      type: 'number',
    },
    modifyTime: {
      type: 'number',
    },
    accessTime: {
      type: 'number',
    },
    rights: {
      type: 'object',
      properties: {
        user: {
          type: 'string',
        },
        group: {
          type: 'string',
        },
        other: {
          type: 'string',
        },
      },
    },
    owner: {
      type: 'number',
    },
    group: {
      type: 'number',
    },
    attachment_url: {
      type: 'string',
    },
  },
};

const lookupObjectsFetchAll = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: module.exports.lookupObject,
    },
  },
};

module.exports.lookupObjectsEmitIndividually = lookupObject;
module.exports.lookupObjectsFetchAll = lookupObjectsFetchAll;
module.exports.lookupObjectsFetchPage = lookupObjectsFetchAll;
module.exports.lookupObject = lookupObject;
