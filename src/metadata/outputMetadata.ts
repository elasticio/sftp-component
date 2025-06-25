export const lookupObject = {
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
    directory: {
      type: 'string',
    },
    path: {
      type: 'string',
    },
  },
};

export const lookupObjectsFetchAll = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: module.exports.lookupObject,
    },
  },
};

export const lookupObjectsEmitIndividually = lookupObject;
export const lookupObjectsFetchPage = lookupObjectsFetchAll;
