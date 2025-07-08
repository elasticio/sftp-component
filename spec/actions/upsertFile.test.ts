import assert from 'assert/strict';
import { describe, it } from 'node:test';
import { getContext, creds } from '../common';
import Sftp from '../../src/Sftp';
import { processAction } from '../../src/actions/upsertFile';

describe('"Upload File From URL" action', () => {
  const responses: any = {
    fileExists: false,
    dirExists: true,
    mkdir: true,
    put: true,
    stat: { filename: '/dir/name.txt', size: 123 }
  };

  Sftp.prototype.connect = () => true as any;
  Sftp.prototype.exists = (p): any => {
    if (p === '/dir/name.txt') return responses.fileExists;
    if (p === '/dir') return responses.dirExists;
    return false;
  };
  Sftp.prototype.mkdir = (dir, recursive) => responses.mkdir;
  Sftp.prototype.put = (url, filename, opts) => responses.put;
  Sftp.prototype.stat = (filename) => responses.stat;

  it('should throw if file exists and updateBehavior is error', async () => {
    responses.fileExists = true;
    const cfg = { ...creds, updateBehavior: 'error' };
    const msg = {
      body: {
        filename: '/dir/name.txt',
        attachmentUrl: 'http://some-url/file.txt',
        encoding: null
      }
    };
    const context = getContext();
    await assert.rejects(
      processAction.call(context, msg, cfg),
      { message: /File with given name exists\. File updates are not permissible/ }
    );
  });

  it('should create directory if file does not exist and parent dir does not exist', async () => {
    responses.fileExists = false;
    responses.dirExists = false;
    const cfg = { ...creds, updateBehavior: 'overwrite' };
    const msg = {
      body: {
        filename: '/dir/name.txt',
        attachmentUrl: 'http://some-url/file.txt',
        encoding: null
      }
    };
    const context = getContext();

    const res = await processAction.call(context, msg, cfg);
    assert.deepEqual(res.body, responses.stat);
  });

  it('should not create directory if it exists, should allow overwrite', async () => {
    responses.fileExists = false;
    responses.dirExists = true;
    let mkdirCalled = false;
    Sftp.prototype.mkdir = (): any => {
      mkdirCalled = true;
      return true;
    };
    const cfg = { ...creds, updateBehavior: 'overwrite' };
    const msg = {
      body: {
        filename: '/dir/exists.txt',
        attachmentUrl: 'http://some-url/file2.txt',
        encoding: 'utf8'
      }
    };
    const context = getContext();

    const res = await processAction.call(context, msg, cfg);
    assert.strictEqual(mkdirCalled, false, 'mkdir should NOT be called when dir exists');
    assert.deepEqual(res.body, responses.stat);
  });
});
