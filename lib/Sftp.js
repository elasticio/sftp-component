/* eslint-disable no-underscore-dangle */
const Client = require('ssh2-sftp-client');
const ip = require('./ip.js');

module.exports = class Sftp {
  constructor(logger, cfg) {
    this.logger = logger;
    this._cfg = cfg;
    this._client = new Client();
    this._client.on('error', (err) => {
      this.logger.error('SFTP error: ', err);
    });
    this._client.on('end', () => {
      this.logger.info('SFTP disconnected');
    });
    this._client.on('close', (errBoolean) => {
      if (errBoolean) {
        this.logger.error('SFTP closed due to error');
      } else {
        this.logger.info('SFTP closed');
      }
    });
  }

  static async createConnectionOptions() {
    const host = this._cfg.host.trim();
    const port = parseInt(this._cfg.port, 10) || 22;

    const address = await ip.resolve(host);
    this.logger.info(`IP successfully resolved to ${address}`);
    return {
      host,
      port,
      username: this._cfg.username,
      password: this._cfg.password,
    };
  }

  static createPath(dir, file) {
    if (dir.charAt(dir.length - 1) !== '/') {
      return `${dir}/${file}`;
    }
    return dir + file;
  }

  async connect() {
    const opts = await Sftp.createConnectionOptions();
    await this._client.connect(opts);
  }

  async end() {
    await this._client.end();
  }
};
