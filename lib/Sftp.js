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
    this.logger.info('Client successfully connected');
  }

  async cwd() {
    const cwd = await this._client.cwd();
    return cwd;
  }

  async delete(path) {
    await this._client.delete(path);
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

  /**
   * @recursive: if set to true, function will create all non existing directories in the dir path
   */
  async mkdir(dir, recursive = true) {
    await this._client.mkdir(dir, recursive);
  }

  async move(fromPath, toPath) {
    await this._client.move(fromPath, toPath);
  }

  /**
   * @src: string | buffer | readable stream. Data source for data to copy to the remote server.
   */
  async put(src, remotePath, options) {
    await this._client.put(src, remotePath, options);
  }

  /**
   * Renames from fromPath to toPath
   */
  async rename(fromPath, toPath) {
    await this._client.rename(fromPath, toPath);
  }

  async stat(path) {
    const stats = await this._client.stat(path);
    return stats;
  }

  async rmdir(dir, recursive) {
    await this._client.rmdir(dir, recursive);
  }
};
