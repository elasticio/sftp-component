'use strict';
const Client = require('ssh2-sftp-client');
const request = require('request');
const path = require('path');
const eioUtils = require('elasticio-node').messages;
const url = require('url');

const sftp = new Client();

function createConnectObject(cfg) {
    const parsedURL = url.parse(cfg.host);
    return {
        host: parsedURL.hostname || parsedURL.path,
        port: parsedURL.port || 22,
        username: cfg.username,
        password: cfg.password
    };
}

/**
 * This function will be called during component intialization
 *
 * @param cfg
 * @returns {Promise}
 */
async function init(cfg) {
    console.log('Initializing SFTP component, connecting to SFTP server');
    const connectObject = createConnectObject(cfg);
    await sftp.connect(connectObject);
    console.log(`Connected to the server ${connectObject.host}`);
}


/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param msg incoming message object that contains ``body`` with payload
 * @param cfg configuration that is account information and configuration field values
 */
async function processAction(msg, cfg) {
    const result = {
        results: []
    };
    const dir = cfg.directory || '/';
    console.log('Uploading files to SFTP location directory=%j', dir);
    const isExists = await sftp.exists(dir);
    if(!isExists) {
        console.log(`The path ${dir} does not exists, going to create it recursively`);
        await sftp.mkdir(dir, true);
        console.log(`Path ${dir} created`);
    }
    console.log('Found %s attachments', Object.keys(msg.attachments || {}).length);
    for (let key in msg.attachments || {}) {
        const attachment = msg.attachments[key];
        const targetPath = path.resolve(dir, key);
        console.log('Processing attachment=%s content=%j target=%s', key, attachment, targetPath);
        await sftp.put(request(attachment.url), targetPath);
        console.log('Uploaded file=%s', targetPath);
        result.results.push({
            attachment: key,
            uploadedOn: new Date().toISOString(),
            fileName: targetPath
        });
    }
    console.log('Execution completed');
    await this.emit('data', eioUtils.newMessageWithBody(result));
}

/**
 * cfg - This is the same config as the one passed to "processMessage" method of the trigger or action
 * startData - result from the startup
 */
module.exports.shutdown = function shutdownHook() {
    sftp.end();
};

module.exports.process = processAction;
module.exports.init = init;

