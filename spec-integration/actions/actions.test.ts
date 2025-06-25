import assert from 'assert/strict';
import { describe, it, mock } from 'node:test';
import { getContext, creds } from '../common';
import { processAction as upload } from '../../src/actions/upload';
import { processAction as upsertFile } from '../../src/actions/upsertFile';
import { processAction as lookupObject } from '../../src/actions/lookupObject';
import { processAction as lookupObjects, getMetaModel as lookupObjectsGetMetaModel } from '../../src/actions/lookupObjects';
import { processAction as moveFile } from '../../src/actions/moveFile';
import { processAction as deleteA } from '../../src/actions/delete';

describe('actions', async () => {
  describe('should succeed', async () => {
    it('Upload Files From Attachments Header', async () => {
      const cfg = { ...creds, directory: '/upload' };
      const context = getContext();
      const msg = {
        body: {},
        attachments: {
          'cat from headers.jpg': {
            url: 'https://filebrowser.psteam.vip/filebrowser/api/public/dl/WHclJN-Y/cat.jpg',
          },
        },
      };
      const result = await upload.call(context, msg, cfg);
      assert.equal(!!result?.body?.results?.[0]?.attachment, true);
    });
    it('Upload File From URL', async () => {
      const cfg = { ...creds, directory: '/upload' };
      const context = getContext();
      const msg = {
        body: {
          filename: '/upload/cat from body.jpg',
          attachmentUrl: 'https://filebrowser.psteam.vip/filebrowser/api/public/dl/WHclJN-Y/cat.jpg',
          encoding: 'utf8',
          fileMod: '0644',
        },
      };
      const result = await upsertFile.call(context, msg, cfg);
      assert.equal(result.body.size, 174335);
    });
    it('Download File by name', async () => {
      const cfg = { ...creds, emitFileContent: true };
      const context = getContext();
      const msg = {
        body: {
          path: '/upload/cat from body.jpg',
        },
      };
      const result = await lookupObject.call(context, msg, cfg);
      assert.equal(result.body.size, 174335);
    });
    it('Download Files - getMetaModel', async () => {
      const cfg = { ...creds, termNumber: 2, emitBehavior: 'fetchAll' };
      const context = getContext();
      const result = await lookupObjectsGetMetaModel.call(context, cfg);
      assert.equal(!!result.in.properties.directoryPath, true);
      assert.equal(!!result.in.properties.searchTerm0, true);
      assert.equal(!!result.in.properties.criteriaLink0, true);
      assert.equal(!!result.in.properties.searchTerm1, true);
    });
    it('Download Files - processAction: fetchAll', async () => {
      const cfg = { ...creds, termNumber: 2, emitBehaviour: 'fetchAll', emitFileContent: true };
      const context = getContext();
      const emittedMessages: any[] = [];
      context.emit = mock.fn((evt, data) => {
        if (evt === 'data') emittedMessages.push(data);
      });
      const msg = {
        body: {
          directoryPath: '/upload/',
          searchTerm0: {
            fieldName: 'name',
            condition: 'eq',
            fieldValue: 'cat from body.jpg',
          },
          criteriaLink0: 'or',
          searchTerm1: {
            fieldName: 'name',
            condition: 'eq',
            fieldValue: 'cat from headers.jpg',
          },
        },
      };
      await lookupObjects.call(context, msg, cfg);
      assert.equal(!!emittedMessages[0].body.results, true);
    });
    it('Download Files - processAction: fetchAll', async () => {
      const cfg = { ...creds, emitBehaviour: 'fetchAll' };
      const context = getContext();
      const emittedMessages: any[] = [];
      context.emit = mock.fn((evt, data) => {
        if (evt === 'data') emittedMessages.push(data);
      });
      const msg = { body: { directoryPath: '/upload/' }, };
      await lookupObjects.call(context, msg, cfg);
      assert.equal(!!emittedMessages[0].body.results, true);
    });
    it('Download Files - processAction: emitIndividually', async () => {
      const cfg = { ...creds, emitBehaviour: 'emitIndividually' };
      const context = getContext();
      const emittedMessages: any[] = [];
      context.emit = mock.fn((evt, data) => {
        if (evt === 'data') emittedMessages.push(data);
      });
      const msg = { body: { directoryPath: '/upload/' }, };
      await lookupObjects.call(context, msg, cfg);
      assert.equal(!!emittedMessages[0].body.name, true);
    });
    it('Move File', async () => {
      const cfg = { ...creds };
      const context = getContext();
      const emittedMessages: any[] = [];
      context.emit = mock.fn((evt, data) => { if (evt === 'data') emittedMessages.push(data); });
      const msg = { body: { filename: '/upload/cat from body.jpg', newFilename: '/upload/cat from body n.jpg' }, };
      await moveFile.call(context, msg, cfg);
      assert.equal(emittedMessages[0].body.newFilename, msg.body.newFilename);
    });
    it('Delete File', async () => {
      const cfg = { ...creds, emitBehaviour: 'emitIndividually' };
      const context = getContext();
      const emittedMessages: any[] = [];
      context.emit = mock.fn((evt, data) => { if (evt === 'data') emittedMessages.push(data); });
      const msg = { body: { path: '/upload/cat from body n.jpg' }, };
      const result = await deleteA.call(context, msg, cfg);
      assert.equal(result.body.id, msg.body.path);
    });
  });
});
