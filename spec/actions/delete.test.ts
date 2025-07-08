import assert from 'assert/strict';
import { describe, it } from 'node:test';
import { getContext, creds } from '../common';
import Sftp from '../../src/Sftp';
import { processAction } from '../../src/actions/delete';

describe('"Delete File" action', () => {
  const responses: any = {
    exists: false,
    delete: true,
  };
  Sftp.prototype.connect = () => true as any;
  Sftp.prototype.exists = () => responses.exists;
  Sftp.prototype.delete = () => responses.delete;
  it('should emit empty message if path is not provided', async () => {
    const cfg = { ...creds };
    const msg = { body: {} };
    const context = getContext();
    const res = await processAction.call(context, msg, cfg);
    assert.deepEqual(res.body, {});
  });

  it('should emit empty message if file does not exist', async () => {
    const cfg = { ...creds };
    const msg = { body: { path: '/some/nonexistent/file.txt' } };
    const context = getContext();
    const res = await processAction.call(context, msg, cfg);
    assert.deepEqual(res.body, {});
  });

  it('should delete the file and emit its id if it exists', async () => {
    responses.exists = true;
    const cfg = { ...creds };
    const msg = { body: { path: '/some/nonexistent/file.txt' } };
    const context = getContext();
    const res = await processAction.call(context, msg, cfg);
    assert.deepEqual(res.body.id, msg.body.path);
  });
});
