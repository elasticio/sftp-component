'use strict';

const sftp = require('../lib/sftp.js');
const ip = require('../lib/ip.js');
const Q = require('q');
const fs = require('fs');
const expect = require('chai').expect;
const sinon = require('sinon');

describe('SFTP', () => {
    afterEach(() => {
        sinon.reset();
    });

    it('create connection options', async() => {
        const cfg = {
            host: 'localhost',
            port: '22',
            username: 'root',
            password: 'secret'
        };

        let result;

        await sftp.createConnectionOptions(cfg).then((opts) => {
            result = opts;
        });
        expect(result).to.eql({
            host: 'localhost',
            port: 22,
            username: 'root',
            password: 'secret'
        });
    });

    it('create connection options with protocol', async () => {
        const cfg = {
            host: 'localhost',
            port: '88',
            username: 'root',
            password: 'secret'
        };

        let result;

        await sftp.createConnectionOptions(cfg).then((opts) => {
            result = opts;
        });
        expect(result).to.eql({
            host: 'localhost',
            port: 88,
            username: 'root',
            password: 'secret'
        });

    });

    it('create connection options with port', () => {
        const cfg = {
            host: 'localhost:6789',
            username: 'root',
            password: 'secret'
        };

        let result;

        runs(() => {
            sftp.createConnectionOptions(cfg).then((opts) => {
                result = opts;
            });
        });

        waitsFor(() => {
            return result;
        }, 'Promise must have returned', 750);

        runs(() => {

            expect(result).toEqual({
                host: 'localhost',
                port: 6789,
                username: 'root',
                password: 'secret'
            });
        });

    });

    it('create connection options with colon but no port', () => {
        const cfg = {
            host: 'localhost:',
            username: 'root',
            password: 'secret'
        };

        let result;

        runs(() => {
            sftp.createConnectionOptions(cfg).then((opts) => {
                result = opts;
            });
        });

        waitsFor(() => {
            return result;
        }, 'Promise must have returned', 750);

        runs(() => {

            expect(result).toEqual({
                host: 'localhost',
                port: 22,
                username: 'root',
                password: 'secret'
            });
        });

    });

    it('create connection options with non-numeric port', () => {
        const cfg = {
            host: 'localhost:aaa',
            username: 'root',
            password: 'secret'
        };

        let result;

        runs(() => {
            sftp.createConnectionOptions(cfg).then((opts) => {
                result = opts;
            });
        });

        waitsFor(() => {
            return result;
        }, 'Promise must have returned', 750);

        runs(() => {

            expect(result).toEqual({
                host: 'localhost',
                port: 22,
                username: 'root',
                password: 'secret'
            });
        });

    });

    it('create connection options with host to be trimmed', () => {
        const cfg = {
            host: '    localhost ',
            username: 'root',
            password: 'secret'
        };

        let result;

        runs(() => {
            sftp.createConnectionOptions(cfg).then((opts) => {
                result = opts;
            });
        });

        waitsFor(() => {
            return result;
        }, 'Promise must have returned', 750);

        runs(() => {

            expect(result).toEqual({
                host: 'localhost',
                port: 22,
                username: 'root',
                password: 'secret'
            });
        });

    });

    it('read file', () => {
        const stream = fs.createReadStream(__dirname + '/data.txt');

        const client = {
            createReadStream: null,
            mkdir: null
        };

        spyOn(client, 'mkdir').andCallFake((path) => {
            return true;
        });

        spyOn(client, 'createReadStream').andCallFake((path) => {
            return stream;
        });

        let result;

        runs(() => {
            sftp.readFile(client, '/foo/bar/baz', (err, buffer) => {
                result = buffer;
            });
        });

        waitsFor(() => {
            return result;
        }, 'Promise must have returned', 750);

        runs(() => {
            expect(result.toString('utf8')).toEqual('Lorem ipsum');
        });

    });
});
