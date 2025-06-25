import assert from 'assert/strict';
import { describe, it } from 'node:test';
import { getContext, creds } from '../common';
import Sftp from '../../src/Sftp';
import { processAction } from '../../src/actions/lookupObjects';

describe('"Download Files" action', () => {
  const responses: any = {
    exists: true,
    list: [],
    getFile: null,
  };
  Sftp.prototype.connect = () => true as any;
  Sftp.prototype.exists = () => responses.exists;
  Sftp.prototype.list = () => responses.list;
  Sftp.prototype.getFile = () => responses.getFile;

  it('should throw error if directory does not exist', async () => {
    responses.exists = false;
    const cfg = { ...creds };
    const msg = { body: { directoryPath: '/not-here' } };
    const context = getContext();
    await assert.rejects(
      processAction.call(context, msg, cfg),
      { message: /is not exist/ }
    );
  });

  it('should emit data with base64 content if emitFileContent = true and emitIndividually', async () => {
    responses.exists = true;
    responses.list = [
      { name: 'file.txt', type: '-', size: 10, accessTime: 1, modifyTime: 2 }
    ];
    responses.getFile = 'QkFTRTY0';
    const cfg = {
      ...creds,
      emitFileContent: true,
      emitBehaviour: 'emitIndividually',
      fileUploadRetry: 1,
      retryTimeout: 1,
      fileUploadTimeout: 1
    };
    const msg = { body: { directoryPath: '/files' } };
    const emitted: any = [];
    const context: any = getContext();
    context.emit = (event, data) => { if (event === 'data') emitted.push(data); };

    await processAction.call(context, msg, cfg);

    assert.strictEqual(emitted.length, 1, 'should emit one file');
    assert(emitted[0].body.base64Content === 'QkFTRTY0');
    assert(emitted[0].body.name === 'file.txt');
  });

  it('should emit data attachments if uploadFilesToAttachments = Yes and emitIndividually', async () => {
    responses.exists = true;
    responses.list = [
      { name: 'doc.pdf', type: '-', size: 567, modifyTime: 1234567890, accessTime: 1234567890 }
    ];
    responses.getFile = 'http://example.com/dl/doc.pdf';
    const cfg = {
      ...creds,
      uploadFilesToAttachments: 'Yes',
      emitBehaviour: 'emitIndividually',
      fileUploadRetry: 1,
      retryTimeout: 1,
      fileUploadTimeout: 1
    };
    const msg = { body: { directoryPath: '/docs' }, id: 'someEventId' };
    const emitted: any = [];
    const context: any = getContext();
    context.emit = (event, data) => { if (event === 'data') emitted.push(data); };

    await processAction.call(context, msg, cfg);

    assert.strictEqual(emitted.length, 1);
    assert(emitted[0].body.attachment_url === 'http://example.com/dl/doc.pdf');
    assert(emitted[0].attachments['doc.pdf'].url === 'http://example.com/dl/doc.pdf');
  });

  it('should emit all results in single message with attachments if emitBehaviour = fetchAll', async () => {
    responses.exists = true;
    responses.list = [
      { name: 'a.txt', type: '-', size: 1, accessTime: 1, modifyTime: 2 },
      { name: 'b.txt', type: '-', size: 2, accessTime: 1, modifyTime: 2 },
    ];
    responses.getFile = 'http://example.com/file';
    const cfg = {
      ...creds,
      uploadFilesToAttachments: 'Yes',
      emitBehaviour: 'fetchAll',
      fileUploadRetry: 1,
      retryTimeout: 1,
      fileUploadTimeout: 1
    };
    const msg = { body: { directoryPath: '/manyfiles' }, id: 'theid' };
    const emitted: any = [];
    const context: any = getContext();
    context.emit = (event, data) => { if (event === 'data') emitted.push(data); };

    await processAction.call(context, msg, cfg);

    assert.strictEqual(emitted.length, 1, 'Should emit only one message');
    assert.deepEqual(Object.keys(emitted[0].attachments), ['a.txt', 'b.txt']);
    assert(Array.isArray(emitted[0].body.results));
    assert(emitted[0].body.results.length === 2);
  });
});
