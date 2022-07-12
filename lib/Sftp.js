/* eslint-disable no-underscore-dangle */
const { Client } = require('./utils/utils');
const ip = require('./ip');

module.exports = class Sftp {
  constructor(logger, cfg) {
    this.logger = logger;
    this._cfg = cfg;
    this._client = new Client();
    this._client.on('error', () => {
      this.logger.error('SFTP error');
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
      host, port = 22, username, password, privateKey, passphrase,
    } = this._cfg;
    await ip.resolve(host);
    this.logger.debug('IP successfully resolved');
    const params = {
      host,
      port,
      username,
      retries: 1,
      readyTimeout: 10000,
    };
    if (password) {
      params.password = password;
    } else if (privateKey) {
      params.privateKey = privateKey;
      if (passphrase) params.passphrase = passphrase;
    }
    return params;
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

  async get(remotePath, dest) {
    return this._client.get(remotePath, dest);
  }

  async getReadStream(remotePath) {
    return this._client.getReadStream(remotePath);
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

  /**
   * @src: string | buffer | readable stream. Data source for data to copy to the remote server.
   */
  async put(src, remotePath, options) {
    await this._client.put(src, remotePath, options);
  }

  /**
   * Renames from fromPath to toPath
   */
  async move(fromPath, toPath) {
    try {
      await this._client.posixRename(fromPath, toPath);
    } catch (e) {
      // Matching based on error text is not ideal: https://github.com/mscdex/ssh2-streams/issues/159
      if (e.message !== 'Server does not support this extended request') {
        throw e;
      }
      this.logger.info('POSIX rename not available. Will fall back to delete and then rename.');
      const destinationFileAlreadyExists = await this.exists(toPath);
      if (destinationFileAlreadyExists) {
        this.logger.info('Destination path already exists. It will be deleted');
        this.delete(toPath);
      }
      await this._client.rename(fromPath, toPath);
    }
  }

  async stat(path) {
    const stats = await this._client.stat(path);
    if (stats.accessTime) {
      stats.accessTime = new Date(stats.accessTime);
    }
    if (stats.modifyTime) {
      stats.modifyTime = new Date(stats.modifyTime);
    }
    return stats;
  }

  async rmdir(dir, recursive) {
    await this._client.rmdir(dir, recursive);
  }
};
