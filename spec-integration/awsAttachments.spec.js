const fs = require('fs');
const chai = require('chai');

const { expect } = chai;

const awsAttachments = require('../lib/awsAttachments');

describe('Aws attachment', function() {
  this.timeout(50000);

  before(async () => {
    if (fs.existsSync('.env')) {
      require('dotenv').config();
    }
  });

  it('adding attachment', async () => {
    const stream = fs.createReadStream('spec-integration/samples/test.csv');
    const result = await awsAttachments.addAttachment({}, 'test.csv', stream, 1215);
      expect(Object.keys(result.attachments)[0]).to.eql('test.csv');
  });
});
