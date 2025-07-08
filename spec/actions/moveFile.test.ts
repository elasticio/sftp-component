import assert from 'assert/strict';
import { describe, it } from 'node:test';
import { getContext, creds } from '../common';
import Sftp from '../../src/Sftp';
import { processAction } from '../../src/actions/moveFile';

describe('"Move File" action', () => {
  const responses: any = {
    exists: false,
    move: true,
  };
  Sftp.prototype.connect = () => true as any;
  Sftp.prototype.exists = (path) => responses.exists;
  Sftp.prototype.move = (oldPath, newPath) => responses.move;

  it('should throw error if filename or newFilename is missing', async () => {
    const cfg = { ...creds };
    const context = getContext();

    // Both missing
    let msg = { body: {} };
    await assert.rejects(
      processAction.call(context, msg, cfg),
      { message: /must be provided/ }
    );

    // filename missing
    msg = { body: { newFilename: '/target.txt' } };
    await assert.rejects(
      processAction.call(context, msg, cfg),
      { message: /must be provided/ }
    );

    // newFilename missing
    msg = { body: { filename: '/source.txt' } };
    await assert.rejects(
      processAction.call(context, msg, cfg),
      { message: /must be provided/ }
    );
  });

  it('should throw error if file does not exist', async () => {
    responses.exists = false; // file does not exist
    const cfg = { ...creds };
    const msg = { body: { filename: '/source.txt', newFilename: '/target.txt' } };
    const context = getContext();
    await assert.rejects(
      processAction.call(context, msg, cfg),
      { message: /does not exist/ }
    );
  });

  it('should move the file and emit the message if file exists', async () => {
    responses.exists = true;
    responses.move = true;
    const cfg = { ...creds };
    const msg = { body: { filename: '/source.txt', newFilename: '/target.txt' } };
    const context: any = getContext();

    let emittedMessage;
    context.emit = (event, data) => {
      if (event === 'data') emittedMessage = data;
    };

    await processAction.call(context, msg, cfg);

    assert(emittedMessage, 'Should emit a message');
    assert.deepEqual(emittedMessage.body, msg.body);
  });
});
