/* eslint-disable no-underscore-dangle */
const Client = require('ssh2-sftp-client');
const ip = require('./ip');

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

  async createConnectionOptions() {
    const {
      host, port = 22, username, password,
    } = this._cfg;
    const address = await ip.resolve(host);
    this.logger.info(`IP successfully resolved to ${address}`);
    return {
      host,
      port,
      username,
      password,
      retries: 1,
      readyTimeout: 10000,
    };
  }

  static createPath(dir, file) {
    if (dir.charAt(dir.length - 1) !== '/') {
      return `${dir}/${file}`;
    }
    return dir + file;
  }

  async connect() {
    const opts = await this.createConnectionOptions();
    await this._client.connect(opts);
  }

  async cwd() {
    const cwd = await this._client.cwd();
    return cwd;
  }

  async end() {
    await this._client.end();
  }

  async exists(dir) {
    const exists = await this._client.exists(dir);
    return exists;
  }

  async get(remotePath) {
    const buffer = await this._client.get(remotePath);
    return buffer;
  }

  async list(dir) {
    const list = await this._client.list(dir);
    return list;
  }

  async mkdir(dir, recursive) {
    await this._client.mkdir(dir, recursive);
  }

  async move(fromPath, toPath) {
    await this._client.move(fromPath, toPath);
  }

  async put(src, remotePath, options) {
    await this._client.put(src, remotePath, options);
  }

  async rename(fromPath, toPath) {
    await this._client.rename(fromPath, toPath);
  }
};
