const { LookupObjects } = require('@elastic.io/oih-standard-library/lib/actions/lookupObjects');

class LookupFiles extends LookupObjects {
  // eslint-disable-next-line no-unused-vars,max-len
  static async getObjectsByCriteria(criteria, msg, cfg) {
    const results = {};
    // const results = await lookupObjects(criteria); // Perform lookup
    return results; // Return lookup results
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
  const lookupFilesAction = new LookupFiles(this.logger, this.emit);
  return lookupFilesAction.process(msg, cfg, snapshot);
}

module.exports.process = process;
