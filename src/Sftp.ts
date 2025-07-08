/* eslint-disable no-promise-executor-return */
import Client from 'ssh2-sftp-client';
import { Transform, } from 'node:stream';
import { writeFile, readFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { sleep, AttachmentProcessor } from '@elastic.io/component-commons-library';
import { getUserAgent } from './utils/utils';
import {
  OPERATION_RETRY_MAX_ATTEMPTS,
  OPERATION_RETRY_BASE_DELAY, OPERATION_TIMEOUT,
  CONNECTION_RETRY_MAX_ATTEMPTS,
  CONNECTION_RETRY_BASE_DELAY,
  AUTO_DISCONNECT_TIMEOUT_MS,
  MAX_MESSAGE_SIZE,
  MAX_FILE_SIZE,
  TMP_DATA_PATH
} from './constants';

export default class Sftp {
  private _client: Client;

  private _cfg;

  private _timeout;

  private connected = false;

  private logger;

  constructor(logger, cfg) {
    this.logger = logger;
    this._cfg = cfg;
    const { password, privateKey } = cfg;
    if (password && privateKey) {
      throw new Error('Both: password and private key fields are filled, use only one option');
    } else if (!password && !privateKey) {
      throw new Error('Both: password and private key fields are empty, use only one option');
    }
    this._client = new Client();
    this._timeout = null;
    this.setConnected(false);

    this._client.on('error', (err) => {
      this.setConnected(false);
      this.logger.error(`SFTP error: ${err.message}`);
    });
    this._client.on('end', () => {
      this.setConnected(false);
      this.logger.info('SFTP disconnected');
    });
    this._client.on('close', (errBoolean) => {
      this.setConnected(false);
      if (errBoolean) {
        this.logger.error('SFTP closed due to error');
      } else {
        this.logger.info('SFTP closed');
      }
    });

    const methodsWithConnection = [
      'delete', 'exists', 'get', 'getFile', 'list', 'mkdir', 'put', 'move', 'stat', 'rmdir',
    ];
    methodsWithConnection.forEach((method) => {
      const orig = Object.getPrototypeOf(this)[method];
      this[method] = async (...args) => {
        try {
          if (this._timeout) clearTimeout(this._timeout);
          const operation = ['getFile', 'put'].includes(method)
            ? () => orig.apply(this, args)
            : () => this._timeoutPromise(orig.apply(this, args), method);
          const result = await this._withRetries(operation, method);
          this._resetConnectionTimeout();
          return result;
        } catch (e) {
          this._resetConnectionTimeout();
          throw e;
        }
      };
    });
  }

  _timeoutPromise(promise, methodName = 'SFTP method') {
    return Promise.race([
      promise,
      new Promise(
        (_, reject) => setTimeout(() => reject(new Error(`"${methodName}" timed out after ${Math.round(OPERATION_TIMEOUT / 1000)} seconds`)), OPERATION_TIMEOUT)
      ),
    ]);
  }

  setLogger(logger) {
    this.logger = logger;
  }

  async _withRetries(fn, operation) {
    let attempt = 0;
    let lastError = new Error('Unknown error');
    const maxAttempts = (operation === 'getFile' && this._cfg?.fileUploadRetry) ? Number(this._cfg.fileUploadRetry) : OPERATION_RETRY_MAX_ATTEMPTS;
    while (attempt < maxAttempts) {
      try {
        await this._ensureConnected();
        return await fn();
      } catch (err) {
        attempt++;
        lastError = err;
        this.logger.warn(`"${operation}" attempt ${attempt} failed: ${err.message}${err.code ? `, code: ${err.code}` : ''}`);
        if (attempt < maxAttempts) {
          const delay = (operation === 'getFile' && this._cfg?.retryTimeout) ? Number(this._cfg?.retryTimeout) : OPERATION_RETRY_BASE_DELAY * (2 ** (attempt - 1));
          this.logger.warn(`"${operation}" will retry in ${delay / 1000}s...`);
          await sleep(delay);
        }
      }
    }
    this.logger.error(`"${operation}" failed after ${maxAttempts} attempts: ${lastError.message}`);
    this.end();
    throw lastError;
  }

  setConnected(state) {
    this.connected = state;
  }

  isConnected() {
    return this.connected;
  }

  async _ensureConnected() {
    if (!this.isConnected()) {
      await this.connect();
    }
  }

  _resetConnectionTimeout() {
    if (this._timeout) clearTimeout(this._timeout);
    this._timeout = setTimeout(() => {
      this.logger.info('SFTP auto-disconnect due to idle');
      this.end().catch((e) => {
        this.logger.error(`Failed to auto-disconnect: ${e.message}`);
      });
    }, AUTO_DISCONNECT_TIMEOUT_MS);
  }

  async createConnectionOptions() {
    const {
      host, port = 22, username, password, privateKey, passphrase,
    } = this._cfg;

    const params: any = {
      host,
      port,
      username,
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

  async connect() {
    this.logger.info('Connecting to sftp server...');
    const opts = await this.createConnectionOptions();
    let attempt = 0;
    let lastError = new Error('Unknown error');

    while (attempt < CONNECTION_RETRY_MAX_ATTEMPTS) {
      try {
        await this._client.connect(opts);
        this.setConnected(true);
        this.logger.info('Client successfully connected');
        return;
      } catch (err) {
        attempt++;
        lastError = err;
        this.logger.error(`SFTP connection attempt ${attempt} failed: ${err.message}${err.code ? `, code: ${err.code}` : ''}`);
        if (attempt < CONNECTION_RETRY_MAX_ATTEMPTS) {
          const delay = CONNECTION_RETRY_BASE_DELAY * ((2 ** attempt) - 1);
          this.logger.info(`Retrying to connect in ${(delay / 1000).toFixed(1)} second(s)...`);
          await sleep(delay);
        }
      }
    }
    this.logger.error(`Error connecting to SFTP server after ${CONNECTION_RETRY_MAX_ATTEMPTS} attempts: ${lastError?.message || 'unknown error'}`);
    throw lastError;
  }

  async end() {
    this.setConnected(false);
    try {
      await this._client.end();
    } finally {
      if (this._timeout) clearTimeout(this._timeout);
      this._timeout = null;
    }
  }

  async getFileAndSaveToTmp(remotePath, fileSize): Promise<void> {
    const dataStream = this._client.createReadStream(remotePath, { autoClose: true });

    let operationTimeout;
    const timeOut = this._cfg?.fileUploadTimeout ? Number(this._cfg?.fileUploadTimeout) : OPERATION_TIMEOUT;

    const resetOperationTimeout = () => {
      clearTimeout(operationTimeout);
      operationTimeout = setTimeout(() => {
        const error = new Error(`"getFile" timed out after ${(timeOut / 1000).toFixed(1)} seconds for file: ${remotePath} (size: ${fileSize} bytes)`);
        this.logger.error(error.message);
        dataStream.emit('timeoutError', error);
        dataStream.destroy(error);
      }, timeOut);
    };

    const resetTimeouts = () => {
      resetOperationTimeout();
      this._resetConnectionTimeout();
    };

    resetTimeouts();
    dataStream.on('data', resetTimeouts);
    dataStream.on('end', () => clearTimeout(operationTimeout));
    dataStream.on('error', () => clearTimeout(operationTimeout));
    dataStream.on('close', () => clearTimeout(operationTimeout));

    let bytesProceed = 0;
    let percentCompleted = 0;
    const { logger } = this;
    const trans = new Transform({
      transform(chunk, _encoding, callback) {
        try {
          bytesProceed += chunk.length;
          const percent = Math.round((bytesProceed / fileSize) * 10);
          if (percent > percentCompleted && percent <= 10) {
            logger.debug(`${percent}0% file downloading completed`);
            percentCompleted = percent;
          }
          callback(null, chunk);
        } catch (err) {
          callback(err);
        }
      },
    });
    const dataWithLogs = dataStream.pipe(trans);

    return new Promise((resolve, reject) => {
      const resetAndReject = (err) => {
        clearTimeout(operationTimeout);
        reject(err);
      };
      dataStream.on('timeoutError', resetAndReject);
      dataWithLogs.on('error', resetAndReject);
      Promise.resolve(writeFile(TMP_DATA_PATH, dataWithLogs)).then(resolve).catch(resetAndReject);
    });
  }

  async getFile(remotePath, fileSize, responseFormat: 'base64' | 'attachment', msgId?: string) {
    const maxFileSize = responseFormat === 'base64' ? MAX_MESSAGE_SIZE : MAX_FILE_SIZE;
    if (fileSize > maxFileSize) {
      throw new Error(`File size is ${fileSize} bytes, it violates the platform limit set to ${maxFileSize} bytes`);
    }
    this.logger.debug(`Downloading file from remotePath: ${remotePath}`);
    await this.getFileAndSaveToTmp(remotePath, fileSize);
    this.logger.debug('File downloaded');
    if (responseFormat === 'base64') {
      const data = await readFile(TMP_DATA_PATH);
      return data.toString('base64');
    }
    this.logger.debug('Uploading file to the attachment...');
    if (this._timeout) clearTimeout(this._timeout);
    const getAttachment = async () => createReadStream(TMP_DATA_PATH);
    const attachmentProcessor = new AttachmentProcessor(getUserAgent(), msgId);
    const attachmentId = await attachmentProcessor.uploadAttachment(getAttachment);
    const attachmentUrl = attachmentProcessor.getMaesterAttachmentUrlById(attachmentId);
    this.logger.debug('File uploaded to the attachment successfully');
    return attachmentUrl;
  }

  async put(url, remotePath, options?, msgId?) {
    const attachmentProcessor = new AttachmentProcessor(getUserAgent(), msgId);
    this.logger.debug('Getting attachment...');
    const response = await attachmentProcessor.getAttachment(url, 'stream');
    this.logger.debug('Uploading attachment to targetPath');
    const dataStream = response.data;
    const size = response.headers['content-length'] || null;

    let operationTimeout;

    const resetOperationTimeout = () => {
      clearTimeout(operationTimeout);
      operationTimeout = setTimeout(() => {
        const error = new Error(`"put" timed out after ${(OPERATION_TIMEOUT / 1000).toFixed(1)} seconds`);
        this.logger.error(error.message);
        dataStream.emit('timeoutError', error);
        dataStream.destroy(error);
      }, OPERATION_TIMEOUT);
    };

    const resetTimeouts = () => {
      resetOperationTimeout();
      this._resetConnectionTimeout();
    };

    resetTimeouts();
    dataStream.on('data', resetTimeouts);
    dataStream.on('end', () => clearTimeout(operationTimeout));
    dataStream.on('error', () => clearTimeout(operationTimeout));
    dataStream.on('close', () => clearTimeout(operationTimeout));

    let bytesProceed = 0;
    let percentCompleted = 0;
    const { logger } = this;
    const trans = new Transform({
      transform(chunk, _encoding, callback) {
        try {
          bytesProceed += chunk.length;
          const percent = Math.round((bytesProceed / size) * 10);
          if (percent > percentCompleted && percent <= 10) {
            logger.debug(`${percent}0% file uploading completed`);
            percentCompleted = percent;
          }
          callback(null, chunk);
        } catch (err) {
          callback(err);
        }
      },
    });
    const dataWithLogs = dataStream.pipe(trans);
    return new Promise((resolve, reject) => {
      const resetAndReject = (err) => {
        clearTimeout(operationTimeout);
        reject(err);
      };
      dataStream.on('timeoutError', resetAndReject);
      dataWithLogs.on('error', resetAndReject);
      Promise.resolve(this._client.put(dataWithLogs, remotePath, options)).then(resolve).catch(resetAndReject);
    });
  }

  async delete(remoteFilePath) { return this._client.delete(remoteFilePath, true); }

  async exists(dir) { return this._client.exists(dir); }

  async get(remotePath, dest) { return this._client.get(remotePath, dest); }

  async list(dir) { return this._client.list(dir); }

  async mkdir(dir, recursive = true) { return this._client.mkdir(dir, recursive); }

  async rmdir(dir, recursive) { return this._client.rmdir(dir, recursive); }

  async stat(path) {
    const stats: any = await this._client.stat(path);
    if (stats.accessTime) stats.accessTime = new Date(stats.accessTime);
    if (stats.modifyTime) stats.modifyTime = new Date(stats.modifyTime);
    return stats;
  }

  async move(fromPath, toPath) {
    try {
      await this._client.posixRename(fromPath, toPath);
    } catch (e) {
      if (e.message !== 'Server does not support this extended request') {
        throw e;
      }
      this.logger.warn('POSIX rename not available. Will fall back to delete and then rename.');
      const destinationFileAlreadyExists = await this.exists(toPath);
      if (destinationFileAlreadyExists) {
        this.logger.info('Destination path already exists. It will be deleted');
        await this.delete(toPath);
      }
      await this._client.rename(fromPath, toPath);
    }
  }
}
