describe("SFTP", function () {
    var sftp = require('../lib/sftp.js');
    var ip = require('../lib/ip.js');
    var Q = require('q');
    var fs = require("fs");

    beforeEach(function () {
        spyOn(ip, 'resolve').andCallFake(function () {
            return Q.fcall(function () {
                return "127.0.0.1";
            });
        });
    });

    it('create connection options', function () {
        var cfg = {
            host: "localhost",
            username: "root",
            password: "secret"
        };

        var result;

        runs(function () {
            sftp.createConnectionOptions(cfg).then(function(opts) {
                result = opts;
            });
        });

        waitsFor(function () {
            return result;
        }, "Promise must have returned", 750);

        runs(function () {

            expect(result).toEqual({
                host : 'localhost',
                port : 22,
                username : 'root',
                password : 'secret'
            });
        });



    });

    it('create connection options with protocol', function () {
        var cfg = {
            host: "sftp://localhost",
            username: "root",
            password: "secret"
        };

        var result;

        runs(function () {
            sftp.createConnectionOptions(cfg).then(function(opts) {
                result = opts;
            });
        });

        waitsFor(function () {
            return result;
        }, "Promise must have returned", 750);

        runs(function () {

            expect(result).toEqual({
                host : 'localhost',
                port : 22,
                username : 'root',
                password : 'secret'
            });
        });

    });

    it('create connection options with port', function () {
        var cfg = {
            host: "localhost:6789",
            username: "root",
            password: "secret"
        };

        var result;

        runs(function () {
            sftp.createConnectionOptions(cfg).then(function(opts) {
                result = opts;
            });
        });

        waitsFor(function () {
            return result;
        }, "Promise must have returned", 750);

        runs(function () {

            expect(result).toEqual({
                host : 'localhost',
                port : 6789,
                username : 'root',
                password : 'secret'
            });
        });

    });

    it('create connection options with colon but no port', function () {
        var cfg = {
            host: "localhost:",
            username: "root",
            password: "secret"
        };

        var result;

        runs(function () {
            sftp.createConnectionOptions(cfg).then(function(opts) {
                result = opts;
            });
        });

        waitsFor(function () {
            return result;
        }, "Promise must have returned", 750);

        runs(function () {

            expect(result).toEqual({
                host : 'localhost',
                port : 22,
                username : 'root',
                password : 'secret'
            });
        });

    });

    it('create connection options with non-numeric port', function () {
        var cfg = {
            host: "localhost:aaa",
            username: "root",
            password: "secret"
        };

        var result;

        runs(function () {
            sftp.createConnectionOptions(cfg).then(function(opts) {
                result = opts;
            });
        });

        waitsFor(function () {
            return result;
        }, "Promise must have returned", 750);

        runs(function () {

            expect(result).toEqual({
                host : 'localhost',
                port : 22,
                username : 'root',
                password : 'secret'
            });
        });

    });

    it('create connection options with host to be trimmed', function () {
        var cfg = {
            host: "    localhost ",
            username: "root",
            password: "secret"
        };

        var result;

        runs(function () {
            sftp.createConnectionOptions(cfg).then(function(opts) {
                result = opts;
            });
        });

        waitsFor(function () {
            return result;
        }, "Promise must have returned", 750);

        runs(function () {

            expect(result).toEqual({
                host : 'localhost',
                port : 22,
                username : 'root',
                password : 'secret'
            });
        });

    });

    it('read file', function () {
        var stream = fs.createReadStream(__dirname+"/data.txt");

        var client = {
            createReadStream : null,
            mkdir: null
        };

        spyOn(client, 'mkdir').andCallFake(function (path) {
            return true;
        });

        spyOn(client, 'createReadStream').andCallFake(function (path) {
            return stream;
        });

        var result;

        runs(function () {
            sftp.readFile(client, "/foo/bar/baz", function(err, buffer) {
                result = buffer;
            });
        });

        waitsFor(function () {
            return result;
        }, "Promise must have returned", 750);

        runs(function () {
            expect(result.toString('utf8')).toEqual("Lorem ipsum");
        });

    });
});