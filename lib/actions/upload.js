/* eslint-disable no-invalid-this */
'use strict';

const Client = require('ssh2-sftp-client');
const request = require('request');
const path = require('path');
const eioUtils = require('elasticio-node').messages;

const sftp = new Client();

function createConnectObject(cfg) {
    return {
        host: cfg.host,
        port: cfg.port,
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
    this.logger.info('Initializing SFTP component, connecting to SFTP server');
    const connectObject = createConnectObject(cfg);
    await sftp.connect(connectObject);
    this.logger.info(`Connected to the server ${connectObject.host}`);
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
    this.logger.info('Uploading files to SFTP location directory=%j', dir);
    const isExists = await sftp.exists(dir);
    if (!isExists) {
        this.logger.info(`The path ${dir} does not exists, going to create it recursively`);
        await sftp.mkdir(dir, true);
        this.logger.info(`Path ${dir} created`);
    }
    this.logger.info('Found %s attachments', Object.keys(msg.attachments || {}).length);
    for (let key in msg.attachments || {}) {
        const attachment = msg.attachments[key];
        const targetPath = path.resolve(dir, key);
        this.logger.info('Processing attachment=%s content=%j target=%s', key, attachment, targetPath);
        await sftp.put(request(attachment.url), targetPath);
        this.logger.info('Uploaded file=%s', targetPath);
        result.results.push({
            attachment: key,
            uploadedOn: new Date().toISOString(),
            fileName: targetPath
        });
    }
    this.logger.info('Execution completed');
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

