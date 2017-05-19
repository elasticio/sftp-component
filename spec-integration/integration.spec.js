'use strict';
const expect = require('chai').expect;
const publish = require('../lib/actions/publish');
const consume = require('../lib/triggers/consume');
const EventEmitter = require('events');
const co = require('co');

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

describe('SFTP integration test', () => {


    before(() => {
        if (!process.env.SFTP_URL) throw new Error("Please set SFTP_URL env variable to proceed");
    });

    describe('subscribe then publish', () => {
        const cfg = {
            amqpURI : process.env.AMQP_URL,
            topic: 'integartion-testing-' + (process.env.TRAVIS_COMMIT || 'local')
                + '-' + (process.env.TRAVIS_NODE_VERSION || 'local'),
            bindingKeys: 'foo.bar'
        };

        before(() => publish.init(cfg).then(consume.init(cfg)));


        it('send and receive', () => co(function* gen() {
            console.log('Starting test');
            const receiver = new TestEmitter();
            const sender = new TestEmitter();
            const msg1 = {
                id: 'one',
                body: {
                    routingKey: 'foo.bar',
                    payload: {
                        value: 'foo.bar'
                    }
                },
                attachments: {
                    one: 'http://one.com'
                }
            };
            const msg2 = {
                id: 'two',
                body: {
                    routingKey: 'foo.baz',
                    payload: {
                        value: 'foo.baz'
                    }
                },
                attachments: {
                    two: 'http://two.com'
                }
            };
            console.log('Initializing receiver');
            yield consume.process.call(receiver, {}, cfg);
            yield new Promise((ok) => setTimeout(ok, 1000));
            console.log('Sending messages');
            const out1 = yield publish.process.call(sender, msg1, cfg);
            const out2 = yield publish.process.call(sender, msg2, cfg);
            expect(out1).deep.equal(msg1);
            expect(out2).deep.equal(msg2);
            console.log('Sending completed, now wait');
            yield new Promise((ok) => setTimeout(ok, 1000));
            console.log('Lets check');
            expect(receiver.data.length).equal(1);
            expect(receiver.data[0]).deep.equal({
                id: 'one',
                body: {
                    value: 'foo.bar'
                },
                attachments: {
                    one: 'http://one.com'
                },
                headers: {},
                metadata: {}
            });
        })).timeout(5000);
    });

});
