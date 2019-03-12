/*eslint no-invalid-this: 0 no-console: 0*/
'use strict';
const co = require('co');
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
function init(cfg) {
  return co(function* genInit() {
    console.log('Initializing SFTP component, connecting to SFTP server');
    const connectObject = createConnectObject(cfg);
    return sftp.connect(connectObject);
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
    const result = {
      results: []
    };
    const dir = cfg.directory || '/';
    console.log('Uploading files to SFTP location directory=%j', dir);
    yield sftp.mkdir(dir, true);
    console.log('Directory created');
    console.log('Found %s attachments', Object.keys(msg.attachments || {}).length);
    for (let key in msg.attachments || {}) {
      const attachment = msg.attachments[key];
      const targetPath = path.resolve(dir, key);
      console.log('Processing attachment=%s content=%j target=%s', key, attachment, targetPath);
      yield sftp.put(request(attachment.url), targetPath);
      console.log('Uploaded file=%s', targetPath);
      result.results.push({
        attachment: key,
        uploadedOn: new Date().toISOString(),
        fileName: targetPath
      });
    }
    console.log('Execution completed');
    this.emit('data', eioUtils.newMessageWithBody(result));
  }.bind(this));
}

module.exports.process = processAction;
module.exports.init = init;

