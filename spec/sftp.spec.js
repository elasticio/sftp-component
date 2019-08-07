'use strict';

const sftp = require('../lib/sftp.js');
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


    it('create connection options with no port', async () => {
        const cfg = {
            host: 'localhost',
            username: 'root',
            password: 'secret'
        };

        let spy = sinon.spy(sftp, 'createConnectionOptions');
        let result;

        await sftp.createConnectionOptions(cfg).then((opts) => {
            result = opts;
        });
        expect(spy.errorsWithCallStack.length).to.eql(1);
    });

    it('read file', async () => {
        const stream = fs.createReadStream(__dirname + '/data.txt');

        const client = {
            createReadStream: () => {},
            mkdir: null
        };

        sinon.stub(client, 'mkdir').callsFake((path) => {
            return true;
        });

        sinon.stub(client, 'createReadStream').callsFake((path) => {
            return stream;
        });

        let result;

        await sftp.readFile(client, '/foo/bar/baz', (err, buffer) => {
                result = buffer;
                expect(result.toString('utf8')).to.equal('Lorem ipsum');
            });
        });
});
