'use strict';
const expect = require('chai').expect;
const upload = require('../lib/actions/upload');
const EventEmitter = require('events');
const url = require('url');
const Client = require('ssh2-sftp-client');

class TestEmitter extends EventEmitter {

    constructor(done) {
        super();
        this.data = [];
        this.end = 0;
        this.error = [];

        this.on('data', (value) => this.data.push(value));
        this.on('error', (value) => this.error.push(value));
        this.on('end', () => {
            this.end++;
            done();
        });
    }

}

if (!process.env.SFTP_URL) throw new Error("Please set SFTP_URL env variable to proceed");

describe('SFTP integration test - upload then download', () => {
    const parsed = url.parse(process.env.SFTP_URL);
    const [username, password] = parsed.auth.split(':');
    const cfg = {
        host: parsed.hostname,
        username: username,
        password: password,
        directory: '/www/integration-test/test-' + Math.floor(Math.random() * 10000) + '/'
    };
    const sftp = new Client();

    before(async () => {
        await upload.init(cfg);
        await sftp.connect(cfg);
    });


    it('upload attachment', async () => {
        console.log('Starting test');
        const sender = new TestEmitter();
        const msg = {
            body: {},
            attachments: {
                "logo.svg": {
                    url: "https://app.elastic.io/img/logo.svg"
                }
            }
        };
        await upload.process.call(sender, msg, cfg);
        console.log('Checking response');
        expect(sender.data.length).equal(1);
        expect(sender.data[0].body.results).to.be.an('array');
        expect(sender.data[0].body.results.length).equal(1);
        console.log('Checking SFTP contents');
        const list = await sftp.list(cfg.directory);
        expect(list.length).equal(1);
        expect(list[0].name).equal("logo.svg");
        expect(list[0].size).equal(4379);
    }).timeout(5000);

    after(async () => {
        console.log('Cleaning-up directory %s', cfg.directory);
        await sftp.rmdir(cfg.directory, true);
        console.log('Cleanup completed, closing connection');
        sftp.end();
        upload.shutdown();
    });
});
