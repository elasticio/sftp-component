import assert from 'assert/strict';
import { describe, it } from 'node:test';
import { getContext, creds } from '../common';
import Sftp from '../../src/Sftp';
import { processAction } from '../../src/actions/upload';

describe('"Upload Files From Attachments Header" action', () => {
  const responses: any = {
    exists: false,
    mkdir: true,
    put: true
  };
  Sftp.prototype.connect = () => true as any;
  Sftp.prototype.exists = (dir) => responses.exists;
  Sftp.prototype.mkdir = (dir, recursive) => responses.mkdir;
  Sftp.prototype.put = (url, path, options) => responses.put;

  const getAttachments = (count) => {
    const obj = {};
    for (let i = 1; i <= count; i++) {
      obj[`file${i}`] = { url: `http://file${i}` };
    }
    return obj;
  };

  it('should create directory if it does not exist and upload attachments', async () => {
    responses.exists = false;
    const attachments = getAttachments(2);
    const msg = {
      body: {
        filename: 'someFile.txt'
      },
      attachments
    };
    const cfg = { ...creds, directory: '/incoming' };
    const context = getContext();

    const res = await processAction.call(context, msg, cfg);

    assert.deepEqual(res.body.results.length, 2);
    for (const result of res.body.results) {
      assert(result.attachment === 'file1' || result.attachment === 'file2');
      assert(result.path.startsWith('/incoming/'));
      assert(/^\d{4}-\d{2}-\d{2}T/.test(result.uploadedOn));
    }
  });

  it('should skip mkdir if directory exists', async () => {
    responses.exists = true;
    const attachments = getAttachments(1);
    const msg = {
      body: {
        filename: 'unique.txt'
      },
      attachments
    };
    const cfg = { ...creds, directory: '/ready' };
    const context = getContext();
    const res = await processAction.call(context, msg, cfg);

    assert.strictEqual(res.body.results.length, 1);
    assert.strictEqual(res.body.results[0].attachment, 'file1');
    assert(res.body.results[0].path.startsWith('/ready/'));
  });

  it('should use filename and keyname logic for multiple attachments', async () => {
    responses.exists = true;
    const attachments = getAttachments(2);
    const msg = {
      body: {
        filename: 'multi.pdf'
      },
      attachments
    };
    const cfg = { ...creds, directory: '/docs' };
    const context = getContext();
    const res = await processAction.call(context, msg, cfg);

    assert(res.body.results[0].path.includes('multi_file1'));
    assert(res.body.results[1].path.includes('multi_file2'));
  });

  it('should upload using key name if no filename provided', async () => {
    responses.exists = true;
    const attachments = getAttachments(1);
    const msg = {
      body: {},
      attachments
    };
    const cfg = { ...creds, directory: '/no-filename' };
    const context = getContext();
    const res = await processAction.call(context, msg, cfg);

    assert(res.body.results[0].path, '/no-filename/file1');
  });
});
