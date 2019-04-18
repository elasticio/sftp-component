/*eslint no-invalid-this: 0 no-console: 0*/
'use strict';
const Client = require('ssh2-sftp-client');
const path = require('path');
const PassThrough = require('stream').PassThrough; 
const eioUtils = require('elasticio-node').messages;
const url = require('url');
const attachments = require('../attachments.js');
const Minimatch = require('minimatch').Minimatch;

const sftp = new Client();

/**
 * This function will be called during component intialization
 *
 * @param cfg
 * @returns {Promise}
 * @param {string} cfg.host - host of sftp connection
 * @param {string} cfg.username - username of sftp connection
 * @param {string} cfg.password - password of sftp connection
 */
function init(cfg) {
    const parsedURL = url.parse(cfg.host);
    return sftp.connect(
        {
            host: parsedURL.hostname || parsedURL.path,
            port: parsedURL.port || 22,
            username: cfg.username,
            password: cfg.password
        }
    );
}

/**
 * This method will be called from elastic.io platform providing following data
 *
 * @param {object} msg incoming message - ignored
 * @param {object} cfg configuration
 * @param {string} cfg.directory - directory to read files from
 * @param {string} cfg.glob - pattern to match file extension
 * @param {boolean} cfg.deleteAfterRead - delete files after reading
 */
async function processAction(msg, cfg) {
        console.log('CFG: %j', cfg);
        
        const dir = cfg.directory || '/';
        console.log('Getting files from SFTP directory=%j', dir);
        
        let files = await sftp.list(cfg.directory);

        var glob = new Minimatch(cfg.glob || '*');
        var regexp = new RegExp(cfg.regexp || '');
        
        for(let file of files) {
            
            console.log('File: %j', file);

            if(!glob.match(file.name) || !regexp.test(file.name) || file.type !== '-') {
                continue;
            }

            var stream = new PassThrough();
            sftp.get(path.join(cfg.directory, file.name), stream);

            var msg = eioUtils.newMessageWithBody(file); 

            await attachments.addAttachment(msg, file.name, stream, file.size);
            
            if(cfg.deleteAfterRead) {
                console.log('Deleting file', file.name);
                await sftp.delete(path);
            }

            this.emit('data', msg);
        }
}

module.exports.process = processAction;
module.exports.init = init;