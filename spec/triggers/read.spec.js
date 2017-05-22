var _ = require('lodash');
var component = require('../../lib/triggers/read.js');
var sftp = require('../../lib/sftp.js');
var attachments = require('../../lib/attachments.js');
var Q = require('q');
var Stream = require('stream');
var EventEmitter = require('events').EventEmitter;

describe("SFTP", function () {

    var client = {
        opendir: null,
        readdir: null,
        rename: null,
        mkdir: null,
        createReadStream: null
    };

    var files = [];
    var createClientError = null;
    var opendirError = null;
    var readDirError = null;
    var readdirCalled = false;

    beforeEach(function () {
        spyOn(sftp, 'connect').andCallFake(function (cfg, callback) {
            callback(createClientError, client);
        });

        spyOn(client, 'opendir').andCallFake(function (dir, callback) {
            callback(opendirError);
        });

        spyOn(client, 'readdir').andCallFake(function (handle, callback) {
            var result = readdirCalled ? false : files;

            readdirCalled = true;

            callback(readDirError, result);
        });

        spyOn(sftp, 'close').andCallFake(function () {
        });

        spyOn(attachments, 'addAttachment').andCallFake(function (msg, fileName, stream, contentType) {
            msg.attachments[fileName] = {
                url: "http://loremipsum"
            };

            return Q(msg);
        });
    });

    afterEach(function () {
        files = [];
        createClientError = null;
        opendirError = null;
        readDirError = null;
        readdirCalled = false;
    });


    it('Failed to connect', function () {
        var msg = {};
        var cfg = {};


        createClientError = new Error("Ouch!");

        runAndExpect(msg, cfg, function (err, newMsg, newSnapshot) {
            expect(err.message).toEqual("Ouch!");

            expect(newMsg).toBeUndefined();

            expect(newSnapshot).toBeUndefined();

            expect(sftp.connect).toHaveBeenCalledWith({}, jasmine.any(Function));

            expect(sftp.close).not.toHaveBeenCalled();
        });
    });

    it('No such directory', function () {
        var msg = {};
        var cfg = {};

        opendirError = new Error("No such file or directory");

        runAndExpect(msg, cfg, function (err, newMsg, newSnapshot) {
            expect(err.message).toEqual("No such file or directory");

            expect(newMsg).toBeUndefined();

            expect(newSnapshot).toBeUndefined();

            expect(sftp.connect).toHaveBeenCalledWith({}, jasmine.any(Function));

            expect(client.opendir).toHaveBeenCalledWith('/', jasmine.any(Function));

            expect(sftp.close).toHaveBeenCalled();
        });
    });

    it('Failed to read directory', function () {
        var msg = {};
        var cfg = {};

        readDirError = new Error("Failed to read given directory");

        runAndExpect(msg, cfg, function (err, newMsg, newSnapshot) {
            expect(err.message).toEqual('Failed to read given directory');

            expect(newMsg).toBeUndefined();

            expect(newSnapshot).toBeUndefined();

            expect(sftp.connect).toHaveBeenCalledWith({}, jasmine.any(Function));

            expect(client.opendir).toHaveBeenCalledWith('/', jasmine.any(Function));

            expect(sftp.close).toHaveBeenCalled();
        });
    });


    it('Invalid file pattern causes exception', function () {
        var msg = {};

        var cfg = {
            pattern: "***"
        };

        files = false;

        runAndExpect(msg, cfg, function (err, newMsg, newSnapshot) {
            expect(err.message).toEqual('Invalid regular expression: /***/: Nothing to repeat');

            expect(newMsg).toBeUndefined();

            expect(newSnapshot).toBeUndefined();

            expect(sftp.connect).toHaveBeenCalledWith(cfg, jasmine.any(Function));

            expect(client.opendir).toHaveBeenCalledWith('/', jasmine.any(Function));

            expect(sftp.close).toHaveBeenCalled();
        });
    });

    it('No files available', function () {
        var msg = {};
        var cfg = {};

        files = false;

        runAndExpect(msg, cfg, function (err, newMsg, newSnapshot) {
            expect(err).toBeUndefined();

            expect(newMsg).toBeUndefined();

            expect(newSnapshot).toBeUndefined();

            expect(sftp.connect).toHaveBeenCalledWith({}, jasmine.any(Function));

            expect(client.opendir).toHaveBeenCalledWith('/', jasmine.any(Function));

            expect(sftp.close).toHaveBeenCalled();
        });
    });


    it('No files available in given directory', function () {
        var msg = {};
        var cfg = {
            "directory": "aDir"
        };

        files = false;

        runAndExpect(msg, cfg, function (err, newMsg, newSnapshot) {
            expect(err).toBeUndefined();

            expect(newMsg).toBeUndefined();

            expect(newSnapshot).toBeUndefined();

            expect(sftp.connect).toHaveBeenCalledWith(cfg, jasmine.any(Function));

            expect(client.opendir).toHaveBeenCalledWith('/aDir', jasmine.any(Function));

            expect(sftp.close).toHaveBeenCalled();
        });
    });


    it('File name does not match given pattern', function () {
        var msg = {};
        var cfg = {
            pattern: "aaa"
        };

        files = [
            {
                filename: "foo.xml",
                longname: '-rw-r--r--    1 democommercetools ftpcreator       94 Aug 14 08:25 foo.xml',
                attrs: {
                    size: 94
                }
            }
        ];

        runAndExpect(msg, cfg, function (err, newMsg, newSnapshot) {
            expect(err).toBeUndefined();

            expect(newMsg).toBeUndefined();

            expect(newSnapshot).toBeUndefined();

            expect(sftp.connect).toHaveBeenCalledWith(cfg, jasmine.any(Function));

            expect(client.opendir).toHaveBeenCalledWith('/', jasmine.any(Function));

            expect(sftp.close).toHaveBeenCalled();
        });
    });


    it('File is a folder', function () {
        var msg = {};
        var cfg = {};

        files = [
            {
                filename: "aFolder",
                longname: 'drwxr-xr-x    1 democommercetools ftpcreator       94 Aug 14 08:25 aFolder',
                attrs: {
                    size: 120
                }
            }
        ];

        runAndExpect(msg, cfg, function (err, newMsg, newSnapshot) {
            expect(err).toBeUndefined();

            expect(newMsg).toBeUndefined();

            expect(newSnapshot).toBeUndefined();

            expect(sftp.connect).toHaveBeenCalledWith(cfg, jasmine.any(Function));

            expect(client.opendir).toHaveBeenCalledWith('/', jasmine.any(Function));

            expect(sftp.close).toHaveBeenCalled();
        });
    });


    it('File exceeds maximal file size', function () {
        var msg = {};
        var cfg = {};

        files = [
            {
                filename: "data.xml",
                longname: '-rw-r--r--    1 democommercetools ftpcreator       94 Aug 14 08:25 data.xml',
                attrs: {
                    size: 20971520
                }

            }
        ];

        runAndExpect(msg, cfg, function (err, newMsg, newSnapshot) {
            expect(err).toBeUndefined();

            expect(newMsg).toBeUndefined();

            expect(newSnapshot).toBeUndefined();

            expect(sftp.connect).toHaveBeenCalledWith(cfg, jasmine.any(Function));

            expect(client.opendir).toHaveBeenCalledWith('/', jasmine.any(Function));

            expect(sftp.close).toHaveBeenCalled();
        });
    });


    it('File read successfully', function () {
        var msg = {};
        var cfg = {};

        files = [
            {
                filename: "data.xml",
                longname: '-rw-r--r--    1 democommercetools ftpcreator       94 Aug 14 08:25 data.xml',
                attrs: {
                    size: 10
                }
            },
            {
                filename: ".elasticio_processed",
                longname: 'drwxr-xr-x    1 democommercetools ftpcreator       94 Aug 14 08:25 .elasticio_processed',
                attrs: {
                    size: 10
                }
            }
        ];

        var xml = "<?xml version='1.0' encoding='UTF-8' ?><root><child/></root>";

        var stream = new Stream();
        stream.id = "I'm a stream";

        spyOn(client, 'createReadStream').andCallFake(function (path) {
            return stream;
        });

        spyOn(client, 'rename').andCallFake(function (oldName, newName, callback) {
            callback();
        });

        runAndExpect(msg, cfg, function (err, newMsg, newSnapshot) {
            expect(err).toBeUndefined();

            var attachment = newMsg.attachments['data.xml'];

            expect(attachment.url).toEqual("http://loremipsum");

            expect(attachments.addAttachment).toHaveBeenCalledWith(newMsg, 'data.xml', stream, 10);

            expect(newSnapshot).toBeUndefined();

            expect(sftp.connect).toHaveBeenCalledWith(cfg, jasmine.any(Function));

            expect(client.opendir).toHaveBeenCalledWith('/', jasmine.any(Function));

            expect(sftp.close).toHaveBeenCalled();

            expect(client.rename).toHaveBeenCalled();

            var renameCall = client.rename.calls[0];
            expect(renameCall.args[0]).toEqual("/data.xml");
            expect(renameCall.args[1].indexOf("/.elasticio_processed/data.xml")).toEqual(0);
            expect(renameCall.args[2]).toEqual(jasmine.any(Function));

        });

    });


    it('File read and create processed folder', function () {

        var msg = {};
        var cfg = {};

        files = [
            {
                filename: "data.xml",
                longname: '-rw-r--r--    1 democommercetools ftpcreator       94 Aug 14 08:25 data.xml',
                attrs: {
                    size: 10
                }
            }
        ];

        var xml = "<?xml version='1.0' encoding='UTF-8' ?><root><child/></root>";

        spyOn(sftp, 'readFile').andCallFake(function (client, path, callback) {
            callback(null, new Buffer(xml));
        });

        spyOn(client, 'rename').andCallFake(function (oldName, newName, callback) {
            callback();
        });

        spyOn(client, 'mkdir').andCallFake(function (path, opts, cb) {
            cb(null);
        });

        var stream = new Stream();
        stream.id = "I'm a stream";

        spyOn(client, 'createReadStream').andCallFake(function (path) {
            return stream;
        });

        runAndExpect(msg, cfg, function (err, newMsg, newSnapshot) {
            expect(err).toBeUndefined();

            var attachment = newMsg.attachments['data.xml'];

            expect(attachment.url).toEqual("http://loremipsum");

            expect(attachments.addAttachment).toHaveBeenCalledWith(newMsg, 'data.xml', stream, 10);


            expect(newSnapshot).toBeUndefined();

            expect(sftp.connect).toHaveBeenCalledWith(cfg, jasmine.any(Function));

            expect(client.opendir).toHaveBeenCalledWith('/', jasmine.any(Function));

            expect(sftp.close).toHaveBeenCalled();

            expect(client.mkdir).toHaveBeenCalledWith("/.elasticio_processed", { mode: 16877 }, jasmine.any(Function));


            expect(client.rename).toHaveBeenCalled();

            var renameCall = client.rename.calls[0];
            expect(renameCall.args[0]).toEqual("/data.xml");
            expect(renameCall.args[1].indexOf("/.elasticio_processed/data.xml")).toEqual(0);
            expect(renameCall.args[2]).toEqual(jasmine.any(Function));

        });

    });


    it('File read and create processed folder in a configured directory', function () {

        var msg = {};
        var cfg = {
            directory: "/verylongdirectoryname"
        };

        files = [
            {
                filename: "data.xml",
                longname: '-rw-r--r--    1 democommercetools ftpcreator       94 Aug 14 08:25 data.xml',
                attrs: {
                    size: 10
                }
            }
        ];

        var xml = "<?xml version='1.0' encoding='UTF-8' ?><root><child/></root>";

        spyOn(sftp, 'readFile').andCallFake(function (client, path, callback) {
            callback(null, new Buffer(xml));
        });

        spyOn(client, 'rename').andCallFake(function (oldName, newName, callback) {
            callback();
        });

        spyOn(client, 'mkdir').andCallFake(function (path, opts, cb) {
            cb(null);
        });

        var stream = new Stream();
        stream.id = "I'm a stream";

        spyOn(client, 'createReadStream').andCallFake(function (path) {
            return stream;
        });

        runAndExpect(msg, cfg, function (err, newMsg, newSnapshot) {
            expect(err).toBeUndefined();

            var attachment = newMsg.attachments['data.xml'];

            expect(attachment.url).toEqual("http://loremipsum");

            expect(attachments.addAttachment).toHaveBeenCalled();

            expect(attachments.addAttachment).toHaveBeenCalledWith(newMsg, 'data.xml', stream, 10);


            expect(newSnapshot).toBeUndefined();

            expect(sftp.connect).toHaveBeenCalledWith(cfg, jasmine.any(Function));

            expect(client.opendir).toHaveBeenCalledWith('/verylongdirectoryname', jasmine.any(Function));

            expect(sftp.close).toHaveBeenCalled();

            expect(client.mkdir).toHaveBeenCalledWith("/verylongdirectoryname/.elasticio_processed", { mode: 16877 }, jasmine.any(Function));


            expect(client.rename).toHaveBeenCalled();

            var renameCall = client.rename.calls[0];
            expect(renameCall.args[0]).toEqual("/verylongdirectoryname/data.xml");
            expect(renameCall.args[1].indexOf("/verylongdirectoryname/.elasticio_processed/data.xml")).toEqual(0);
            expect(renameCall.args[2]).toEqual(jasmine.any(Function));

        });

    });

    var runAndExpect = function (msg, cfg, cb) {

        var done = false;

        var newMsg, newSnapshot, err;
        var emitter = new EventEmitter();

        emitter
            .on('data', function (data) {
                newMsg = data;
            })
            .on('error', function (e) {
                err = e;
            })
            .on('end', function () {
                done = true;
            });

        runs(function () {
            component.process.call(emitter, msg, cfg);
        });

        waitsFor(function () {
            return done;
        }, "Next must have been called", 750);

        runs(function () {
            cb(err, newMsg, newSnapshot);
        });
    };
});