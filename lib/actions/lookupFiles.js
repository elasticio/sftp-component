import { NUM_SEARCH_TERMS } from '@elastic.io/oih-standard-library/lib/constants';

const { LookupObjects } = require('@elastic.io/oih-standard-library/lib/actions/lookupObjects');

const CREATED = 'Created Time';
const LAST_MODIFIED = 'Last modified time';
const FILE_SIZE = 'File Size';

class LookupFiles extends LookupObjects {
  // eslint-disable-next-line no-unused-vars,max-len
  async getObjectsByCriteria(criteria, msg, cfg) {
    const results = {};
    // const results = await lookupObjects(criteria); // Perform lookup
    return results; // Return lookup results
  }

  /* Overriding need to add enums to fieldName
   created issue for enhancement
   https://github.com/elstaticasticio/oih-standard-library/issues/16
   */

  getInMetadata(cfg) {
    const numSearchTerms = cfg[NUM_SEARCH_TERMS];
    if (numSearchTerms === undefined) throw new Error('You must have at least one search term');
    const inMetadata = {};
    for (let i = 0; i < numSearchTerms; i++) {
      const searchTerm = `searchTerm${i}`;
      inMetadata[searchTerm] = {
        fieldName: {
          type: 'string',
          required: 'true',
          enum: [LAST_MODIFIED, CREATED, FILE_SIZE],
        },
        fieldValue: {
          type: 'string',
          required: 'true',
        },
        orderBy: {
          type: 'string',
          // enum: ['=', '!=', '>', '<', '>=', '<='],
        },
      };
    }
    return inMetadata;
  }

  getMetaModel(cfg) {
    const metaModel = {};
    metaModel.in = this.getInMetadata(cfg);
    metaModel.out = {
      type: 'object',
      properties: {},
    };
    return metaModel;
  }
}


function process(msg, cfg, snapshot = {}) {
  const lookupFilesAction = new LookupFiles(this.logger, this);
  return lookupFilesAction.process(msg, cfg, snapshot);
}

function getMetaModel(cfg) {
  const lookupFilesAction = new LookupFiles(this.logger, this);
  return lookupFilesAction.getMetaModel(cfg);
}

module.exports.process = process;
module.exports.getMetaModel = getMetaModel;
