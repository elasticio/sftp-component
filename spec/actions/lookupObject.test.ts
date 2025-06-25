import assert from 'assert/strict';
import { describe, it } from 'node:test';
import { getContext, creds } from '../common';
import Sftp from '../../src/Sftp';
import { processAction } from '../../src/actions/lookupObject';

describe('"Download File by name" action', () => {
  const responses: any = {
    list: [],
    getFile: 'dummyContentOrUrl'
  };
  Sftp.prototype.connect = () => true as any;
  Sftp.prototype.setLogger = () => undefined;
  Sftp.prototype.list = (directory) => responses.list;
  Sftp.prototype.getFile = (fileCorrectPath, size, type, id) => responses.getFile;

  const makeFile = (overrides = {}) => ({
    name: 'my.pdf',
    type: '-',
    size: 42,
    accessTime: 1715370000000,
    modifyTime: 1715370000000,
    ...overrides
  });

  it('should throw if path is not provided and not allowed to omit', async () => {
    const cfg = { ...creds, allowCriteriaToBeOmitted: undefined };
    const msg = { body: {} };
    const context = getContext();
    await assert.rejects(
      processAction.call(context, msg, cfg),
      /Empty "Path and File Name" is not allowed/
    );
  });

  it('should emit empty message if path not provided and omitted allowed', async () => {
    const cfg = { ...creds, allowCriteriaToBeOmitted: 'Yes' };
    const msg = { body: {} };
    const context = getContext();
    const res = await processAction.call(context, msg, cfg);
    assert.deepEqual(res.body, {});
  });

  it('should throw if file not found in directory and not allowed to omit', async () => {
    responses.list = [];
    const cfg = { ...creds, allowCriteriaToBeOmitted: undefined };
    const msg = { body: { path: '/a/my.pdf' } };
    const context = getContext();
    await assert.rejects(
      processAction.call(context, msg, cfg),
      /Found 0 files with provided name/
    );
  });

  it('should emit empty message if file not found and omit allowed', async () => {
    responses.list = [];
    const cfg = { ...creds, allowCriteriaToBeOmitted: 'Yes' };
    const msg = { body: { path: '/a/my.pdf' } };
    const context = getContext();
    const res = await processAction.call(context, msg, cfg);
    assert.deepEqual(res.body, {});
  });

  it('should throw for more than one file found and not allowed to omit', async () => {
    responses.list = [makeFile(), makeFile()];
    const cfg = { ...creds, allowCriteriaToBeOmitted: undefined };
    const msg = { body: { path: '/a/my.pdf' } };
    const context = getContext();
    await assert.rejects(
      processAction.call(context, msg, cfg),
      /Found 2 files with provided name/
    );
  });

  it('should emit empty message for more than one file found and omit allowed', async () => {
    responses.list = [makeFile(), makeFile()];
    const cfg = { ...creds, allowCriteriaToBeOmitted: 'Yes' };
    const msg = { body: { path: '/a/my.pdf' } };
    const context = getContext();
    const res = await processAction.call(context, msg, cfg);
    assert.deepEqual(res.body, {});
  });

  it('should download as base64 content if emitFileContent', async () => {
    responses.list = [makeFile({ size: 200 })];
    responses.getFile = 'YGFKEla==';
    const cfg = { ...creds, emitFileContent: true };
    const msg = { body: { path: '/a/my.pdf' } };
    const context = getContext();
    const res = await processAction.call(context, msg, cfg);
    assert.strictEqual(res.body.base64Content, 'YGFKEla==');
    assert.strictEqual(res.body.name, 'my.pdf');
  });

  it('should download as attachment and emit attachments property', async () => {
    responses.list = [makeFile({ size: 300 })];
    responses.getFile = 'https://some-attachment-url';
    const cfg = { ...creds, emitFileContent: false };
    const msg = { id: 'MSG-ID10', body: { path: '/a/my.pdf' } };
    const context = getContext();
    const res = await processAction.call(context, msg, cfg);
    assert.strictEqual(res.body.attachment_url, 'https://some-attachment-url');
    assert(res.attachments);
    assert(res.attachments['my.pdf']);
    assert.strictEqual(res.attachments['my.pdf'].url, 'https://some-attachment-url');
    assert.strictEqual(res.attachments['my.pdf'].size, 300);
  });
});
