import assert from 'assert/strict';
import { describe, it } from 'node:test';
import { getContext, creds } from '../common';
import Sftp from '../../src/Sftp';
import { processAction } from '../../src/actions/readFolder';

describe('"Read Folder" action', () => {
  Sftp.prototype.connect = () => true as any;
  Sftp.prototype.exists = async (dir) => !dir.includes('nonexistent');
  Sftp.prototype.list = async () => [
    { type: '-', name: 'file.txt', size: 100, accessTime: 1, modifyTime: 2 },
    { type: 'd', name: 'subfolder', size: 0, accessTime: 1, modifyTime: 2 },
  ];

  Sftp.prototype.cwd = async () => '/home/sftpuser';

  it('should fall back to the current SFTP directory when no path provided', async () => {
    const context = getContext();
    const res = await processAction.call(context, { body: {} }, { ...creds });
    assert.equal(res.body.directory, '/home/sftpuser');
  });

  it('should throw if directory does not exist', async () => {
    const context = getContext();
    await assert.rejects(
      () => processAction.call(context, { body: { directoryPath: '/some/nonexistent/dir' } }, { ...creds }),
      /is not exist/
    );
  });
});
