const _ = require('lodash');
const Q = require('q');
const Stream = require('stream');
const { EventEmitter } = require('events');
const component = require('../../lib/triggers/read.js');
const sftp = require('../../lib/sftp.js');
const attachments = require('../../lib/attachments.js');

describe('SFTP', () => {
  const client = {
    opendir: null,
    readdir: null,
    rename: null,
    mkdir: null,
    createReadStream: null,
  };

  let files = [];
  let createClientError = null;
  let opendirError = null;
  let readDirError = null;
  let readdirCalled = false;

  beforeEach(() => {
    spyOn(sftp, 'connect').andCallFake((cfg, callback) => {
      callback(createClientError, client);
    });

    spyOn(client, 'opendir').andCallFake((dir, callback) => {
      callback(opendirError);
    });

    spyOn(client, 'readdir').andCallFake((handle, callback) => {
      const result = readdirCalled ? false : files;

      readdirCalled = true;

      callback(readDirError, result);
    });

    spyOn(sftp, 'close').andCallFake(() => {
    });

    spyOn(attachments, 'addAttachment').andCallFake((msg, fileName, stream, contentType) => {
      msg.attachments[fileName] = {
        url: 'http://loremipsum',
      };

      return Q(msg);
    });
  });

  afterEach(() => {
    files = [];
    createClientError = null;
    opendirError = null;
    readDirError = null;
    readdirCalled = false;
  });


  it('Failed to connect', () => {
    const msg = {};
    const cfg = {};


    createClientError = new Error('Ouch!');

    runAndExpect(msg, cfg, (err, newMsg, newSnapshot) => {
      expect(err.message).toEqual('Ouch!');

      expect(newMsg).toBeUndefined();

      expect(newSnapshot).toBeUndefined();

      expect(sftp.connect).toHaveBeenCalledWith({}, jasmine.any(Function));

      expect(sftp.close).not.toHaveBeenCalled();
    });
  });

  it('No such directory', () => {
    const msg = {};
    const cfg = {};

    opendirError = new Error('No such file or directory');

    runAndExpect(msg, cfg, (err, newMsg, newSnapshot) => {
      expect(err.message).toEqual('No such file or directory');

      expect(newMsg).toBeUndefined();

      expect(newSnapshot).toBeUndefined();

      expect(sftp.connect).toHaveBeenCalledWith({}, jasmine.any(Function));

      expect(client.opendir).toHaveBeenCalledWith('/', jasmine.any(Function));

      expect(sftp.close).toHaveBeenCalled();
    });
  });

  it('Failed to read directory', () => {
    const msg = {};
    const cfg = {};

    readDirError = new Error('Failed to read given directory');

    runAndExpect(msg, cfg, (err, newMsg, newSnapshot) => {
      expect(err.message).toEqual('Failed to read given directory');

      expect(newMsg).toBeUndefined();

      expect(newSnapshot).toBeUndefined();

      expect(sftp.connect).toHaveBeenCalledWith({}, jasmine.any(Function));

      expect(client.opendir).toHaveBeenCalledWith('/', jasmine.any(Function));

      expect(sftp.close).toHaveBeenCalled();
    });
  });


  it('Invalid file pattern causes exception', () => {
    const msg = {};

    const cfg = {
      pattern: '***',
    };

    files = false;

    runAndExpect(msg, cfg, (err, newMsg, newSnapshot) => {
      expect(err.message).toEqual('Invalid regular expression: /***/: Nothing to repeat');

      expect(newMsg).toBeUndefined();

      expect(newSnapshot).toBeUndefined();

      expect(sftp.connect).toHaveBeenCalledWith(cfg, jasmine.any(Function));

      expect(client.opendir).toHaveBeenCalledWith('/', jasmine.any(Function));

      expect(sftp.close).toHaveBeenCalled();
    });
  });

  it('No files available', () => {
    const msg = {};
    const cfg = {};

    files = false;

    runAndExpect(msg, cfg, (err, newMsg, newSnapshot) => {
      expect(err).toBeUndefined();

      expect(newMsg).toBeUndefined();

      expect(newSnapshot).toBeUndefined();

      expect(sftp.connect).toHaveBeenCalledWith({}, jasmine.any(Function));

      expect(client.opendir).toHaveBeenCalledWith('/', jasmine.any(Function));

      expect(sftp.close).toHaveBeenCalled();
    });
  });


  it('No files available in given directory', () => {
    const msg = {};
    const cfg = {
      directory: 'aDir',
    };

    files = false;

    runAndExpect(msg, cfg, (err, newMsg, newSnapshot) => {
      expect(err).toBeUndefined();

      expect(newMsg).toBeUndefined();

      expect(newSnapshot).toBeUndefined();

      expect(sftp.connect).toHaveBeenCalledWith(cfg, jasmine.any(Function));

      expect(client.opendir).toHaveBeenCalledWith('/aDir', jasmine.any(Function));

      expect(sftp.close).toHaveBeenCalled();
    });
  });


  it('File name does not match given pattern', () => {
    const msg = {};
    const cfg = {
      pattern: 'aaa',
    };

    files = [
      {
        filename: 'foo.xml',
        longname: '-rw-r--r--    1 democommercetools ftpcreator       94 Aug 14 08:25 foo.xml',
        attrs: {
          size: 94,
        },
      },
    ];

    runAndExpect(msg, cfg, (err, newMsg, newSnapshot) => {
      expect(err).toBeUndefined();

      expect(newMsg).toBeUndefined();

      expect(newSnapshot).toBeUndefined();

      expect(sftp.connect).toHaveBeenCalledWith(cfg, jasmine.any(Function));

      expect(client.opendir).toHaveBeenCalledWith('/', jasmine.any(Function));

      expect(sftp.close).toHaveBeenCalled();
    });
  });


  it('File is a folder', () => {
    const msg = {};
    const cfg = {};

    files = [
      {
        filename: 'aFolder',
        longname: 'drwxr-xr-x    1 democommercetools ftpcreator       94 Aug 14 08:25 aFolder',
        attrs: {
          size: 120,
        },
      },
    ];

    runAndExpect(msg, cfg, (err, newMsg, newSnapshot) => {
      expect(err).toBeUndefined();

      expect(newMsg).toBeUndefined();

      expect(newSnapshot).toBeUndefined();

      expect(sftp.connect).toHaveBeenCalledWith(cfg, jasmine.any(Function));

      expect(client.opendir).toHaveBeenCalledWith('/', jasmine.any(Function));

      expect(sftp.close).toHaveBeenCalled();
    });
  });


  it('File exceeds maximal file size', () => {
    const msg = {};
    const cfg = {};

    files = [
      {
        filename: 'data.xml',
        longname: '-rw-r--r--    1 democommercetools ftpcreator       94 Aug 14 08:25 data.xml',
        attrs: {
          size: 20971520,
        },

      },
    ];

    runAndExpect(msg, cfg, (err, newMsg, newSnapshot) => {
      expect(err).toBeDefined();

      expect(newMsg).toBeUndefined();

      expect(newSnapshot).toBeUndefined();

      expect(sftp.connect).toHaveBeenCalledWith(cfg, jasmine.any(Function));

      expect(client.opendir).toHaveBeenCalledWith('/', jasmine.any(Function));

      expect(sftp.close).toHaveBeenCalled();
    });
  });


  it('File read successfully', () => {
    const msg = {};
    const cfg = {};

    files = [
      {
        filename: 'data.xml',
        longname: '-rw-r--r--    1 democommercetools ftpcreator       94 Aug 14 08:25 data.xml',
        attrs: {
          size: 10,
        },
      },
      {
        filename: '.elasticio_processed',
        longname: 'drwxr-xr-x    1 democommercetools ftpcreator       94 Aug 14 08:25 .elasticio_processed',
        attrs: {
          size: 10,
        },
      },
    ];

    const xml = "<?xml version='1.0' encoding='UTF-8' ?><root><child/></root>";

    const stream = new Stream();
    stream.id = "I'm a stream";

    spyOn(client, 'createReadStream').andCallFake((path) => stream);

    spyOn(client, 'rename').andCallFake((oldName, newName, callback) => {
      callback();
    });

    runAndExpect(msg, cfg, (err, newMsg, newSnapshot) => {
      expect(err).toBeUndefined();

      const attachment = newMsg.attachments['data.xml'];

      expect(attachment.url).toEqual('http://loremipsum');

      expect(attachments.addAttachment).toHaveBeenCalledWith(newMsg, 'data.xml', stream, 10);

      expect(newSnapshot).toBeUndefined();

      expect(sftp.connect).toHaveBeenCalledWith(cfg, jasmine.any(Function));

      expect(client.opendir).toHaveBeenCalledWith('/', jasmine.any(Function));

      expect(sftp.close).toHaveBeenCalled();

      expect(client.rename).toHaveBeenCalled();

      const renameCall = client.rename.calls[0];
      expect(renameCall.args[0]).toEqual('/data.xml');
      expect(renameCall.args[1].indexOf('/.elasticio_processed/data.xml')).toEqual(0);
      expect(renameCall.args[2]).toEqual(jasmine.any(Function));
    });
  });


  it('File read and create processed folder', () => {
    const msg = {};
    const cfg = {};

    files = [
      {
        filename: 'data.xml',
        longname: '-rw-r--r--    1 democommercetools ftpcreator       94 Aug 14 08:25 data.xml',
        attrs: {
          size: 10,
        },
      },
    ];

    const xml = "<?xml version='1.0' encoding='UTF-8' ?><root><child/></root>";

    spyOn(sftp, 'readFile').andCallFake((client, path, callback) => {
      callback(null, new Buffer(xml));
    });

    spyOn(client, 'rename').andCallFake((oldName, newName, callback) => {
      callback();
    });

    spyOn(client, 'mkdir').andCallFake((path, opts, cb) => {
      cb(null);
    });

    const stream = new Stream();
    stream.id = "I'm a stream";

    spyOn(client, 'createReadStream').andCallFake((path) => stream);

    runAndExpect(msg, cfg, (err, newMsg, newSnapshot) => {
      expect(err).toBeUndefined();

      const attachment = newMsg.attachments['data.xml'];

      expect(attachment.url).toEqual('http://loremipsum');

      expect(attachments.addAttachment).toHaveBeenCalledWith(newMsg, 'data.xml', stream, 10);


      expect(newSnapshot).toBeUndefined();

      expect(sftp.connect).toHaveBeenCalledWith(cfg, jasmine.any(Function));

      expect(client.opendir).toHaveBeenCalledWith('/', jasmine.any(Function));

      expect(sftp.close).toHaveBeenCalled();

      expect(client.mkdir).toHaveBeenCalledWith('/.elasticio_processed', { mode: 16877 }, jasmine.any(Function));


      expect(client.rename).toHaveBeenCalled();

      const renameCall = client.rename.calls[0];
      expect(renameCall.args[0]).toEqual('/data.xml');
      expect(renameCall.args[1].indexOf('/.elasticio_processed/data.xml')).toEqual(0);
      expect(renameCall.args[2]).toEqual(jasmine.any(Function));
    });
  });


  it('File read and create processed folder in a configured directory', () => {
    const msg = {};
    const cfg = {
      directory: '/verylongdirectoryname',
    };

    files = [
      {
        filename: 'data.xml',
        longname: '-rw-r--r--    1 democommercetools ftpcreator       94 Aug 14 08:25 data.xml',
        attrs: {
          size: 10,
        },
      },
    ];

    const xml = "<?xml version='1.0' encoding='UTF-8' ?><root><child/></root>";

    spyOn(sftp, 'readFile').andCallFake((client, path, callback) => {
      callback(null, new Buffer(xml));
    });

    spyOn(client, 'rename').andCallFake((oldName, newName, callback) => {
      callback();
    });

    spyOn(client, 'mkdir').andCallFake((path, opts, cb) => {
      cb(null);
    });

    const stream = new Stream();
    stream.id = "I'm a stream";

    spyOn(client, 'createReadStream').andCallFake((path) => stream);

    runAndExpect(msg, cfg, (err, newMsg, newSnapshot) => {
      expect(err).toBeUndefined();

      const attachment = newMsg.attachments['data.xml'];

      expect(attachment.url).toEqual('http://loremipsum');

      expect(attachments.addAttachment).toHaveBeenCalled();

      expect(attachments.addAttachment).toHaveBeenCalledWith(newMsg, 'data.xml', stream, 10);


      expect(newSnapshot).toBeUndefined();

      expect(sftp.connect).toHaveBeenCalledWith(cfg, jasmine.any(Function));

      expect(client.opendir).toHaveBeenCalledWith('/verylongdirectoryname', jasmine.any(Function));

      expect(sftp.close).toHaveBeenCalled();

      expect(client.mkdir).toHaveBeenCalledWith('/verylongdirectoryname/.elasticio_processed', { mode: 16877 }, jasmine.any(Function));


      expect(client.rename).toHaveBeenCalled();

      const renameCall = client.rename.calls[0];
      expect(renameCall.args[0]).toEqual('/verylongdirectoryname/data.xml');
      expect(renameCall.args[1].indexOf('/verylongdirectoryname/.elasticio_processed/data.xml')).toEqual(0);
      expect(renameCall.args[2]).toEqual(jasmine.any(Function));
    });
  });

  var runAndExpect = function (msg, cfg, cb) {
    let done = false;

    let newMsg; let newSnapshot; let
      err;
    const emitter = new EventEmitter();

    emitter
      .on('data', (data) => {
        newMsg = data;
      })
      .on('error', (e) => {
        err = e;
      })
      .on('end', () => {
        done = true;
      });

    runs(() => {
      component.process.call(emitter, msg, cfg);
    });

    waitsFor(() => done, 'Next must have been called', 750);

    runs(() => {
      cb(err, newMsg, newSnapshot);
    });
  };
});
