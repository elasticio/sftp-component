/*eslint no-invalid-this: 0 no-console: 0*/
'use strict';
const co = require('co');
const Client = require('ssh2-sftp-client');
const ip = require('../ip.js');
const request = require('request');
const path = require('path');

const sftp = new Client();

function createConnectObject(cfg) {
    let host = cfg.host.trim();

    const protocolIndex = host.indexOf("sftp://");

    if (protocolIndex === 0) {
        host = host.substring(SFTP_PROTOCOL.length);
    }

    let port = 22;

    const hostAndPort = host.split(':');

    if (hostAndPort.length > 1) {
        let portVal = hostAndPort[1];
        host = hostAndPort[0];

        if (portVal!== '' && !isNaN(portVal)) {
            port = parseInt(portVal);
        }
    }

    return ip.resolve(host).then(function (address) {

        console.log(host, "successfully resolved to", address);

        var options = {
            host: host,
            port: port,
            username: cfg.username,
            password: cfg.password
        };

        return Promise.resolve(options);
    });
}


/**
 * This function will be called during component intialization
 *
 * @param cfg
 * @returns {Promise}
 */
function init(cfg) {
    return co(function* genInit() {
        console.log('Initializing SFTP component, connecting to SFTP server');
        const connectObject = yield createConnectObject(cfg);
        return sftp.connect(connectObject)
    });
}


/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
function processAction(msg, cfg) {
    return co(function* gen() {
        const dir = cfg.directory || '/';
        console.log('Uploading files to SFTP location directory=%j', dir);
        yield sftp.mkdir(dir, true);
        console.log('Directory created');
        console.log('Found %s attachments', Object.keys(msg.attachments || {}).length);
        for(let key in msg.attachments || {}) {
            const attachment = msg.attachments[key];
            const targetPath = path.resolve(dir, key);
            console.log('Processing attachment=%s content=%j target=%s', key, attachment, targetPath);
            yield sftp.put(request(attachment.url), targetPath);
        }
        console.log('Execution completed');
    }.bind(this));
}

module.exports.process = processAction;
module.exports.init = init;

