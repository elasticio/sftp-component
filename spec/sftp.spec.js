/* eslint-disable no-underscore-dangle */
const bunyan = require('bunyan');
const fs = require('fs');
const { expect } = require('chai');
const sinon = require('sinon');
const { readFile } = require('./utils/readFile');
const Sftp = require('../lib/Sftp');

const cfg = {
  host: 'localhost',
  port: 22,
  username: 'root',
  password: 'secret',
};

const connectCfg = {
  host: 'localhost',
  port: 22,
  username: 'root',
  password: 'secret',
  retries: 1,
  readyTimeout: 10000,
};

const dir = '/home/tests/';
const file = 'testFile.xml';

let sftp = new Sftp(bunyan.createLogger({ name: 'dummy' }), cfg);

describe('SFTP', () => {
  afterEach(() => {
    sinon.reset();
  });

  it('create connection options', async () => {
    const opts = await sftp.createConnectionOptions();
    expect(opts).to.deep.equal(connectCfg);
  });

  it('create connection options with protocol', async () => {
    const newCfg = { ...cfg, port: 88 };
    sftp = new Sftp(bunyan.createLogger({ name: 'dummy' }), newCfg);

    const opts = await sftp.createConnectionOptions(newCfg);
    expect(opts).to.deep.equal({
      host: 'localhost',
      port: 88,
      username: 'root',
      password: 'secret',
      retries: 1,
      readyTimeout: 10000,
    });
  });

  it('create connection options with no port', async () => {
    const newCfg = { ...cfg };
    delete newCfg.port;
    sftp = new Sftp(bunyan.createLogger({ name: 'dummy' }), newCfg);

    const spy = sinon.spy(sftp, 'createConnectionOptions');

    await sftp.createConnectionOptions(newCfg);
    expect(spy.errorsWithCallStack.length).to.equal(1);
  });

  it('read file', async () => {
    const stream = fs.createReadStream(`${__dirname}/data.txt`);

    const client = {
      createReadStream: () => null,
      mkdir: null,
    };

    sinon.stub(client, 'mkdir').callsFake(() => true);

    sinon.stub(client, 'createReadStream').callsFake(() => stream);

    let result;

    readFile(client, '/foo/bar/baz', (err, buffer) => {
      result = buffer;
      expect(result.toString('utf8')).to.equal('Lorem ipsum');
    });
  });
});

describe('Tests for SFTP functions', () => {
  it('Creates a path properly', () => {
    const result = Sftp.createPath(dir, file);
    expect(result).to.be.equal('/home/tests/testFile.xml');
  });

  it('Connects to SFTP', async () => {
    const connectSpy = sinon.stub(sftp._client, 'connect');
    await sftp.connect();
    expect(connectSpy.calledOnce).to.be.equal(true);
    expect(connectSpy.getCall(0).args[0]).to.deep.equal(connectCfg);
  });

  it('Properly wraps cwd', async () => {
    const realPathSpy = sinon.stub(sftp._client, 'realPath').returns(dir);
    const currentDir = await sftp.cwd();
    expect(currentDir).to.be.equal(dir);
    expect(realPathSpy.calledOnce).to.be.equal(true);
  });

  it('Properly calls delete on a path', async () => {
    const deleteSpy = sinon.stub(sftp._client, 'delete');
    await sftp.delete(dir);
    expect(deleteSpy.calledOnceWithExactly(dir)).to.be.equal(true);
  });

  it('Properly wraps end', async () => {
    const endSpy = sinon.stub(sftp._client, 'end');
    await sftp.end();
    expect(endSpy.calledOnce).to.be.equal(true);
  });

  it('Checks if file exists', async () => {
    const existSpy = sinon.stub(sftp._client, 'exists').returns(true);
    const result = await sftp.exists(dir);
    expect(existSpy.calledOnce).to.be.equal(true);
    expect(result).to.be.equal(true);
  });

  it('Gets a remote file', async () => {
    const remotePath = '/remote/path/here/';
    const spy = sinon.stub(sftp._client, 'get').returns(Buffer.from('remote-file.txt'));
    const path = await sftp.get(remotePath);
    expect(spy.calledOnce).to.be.equal(true);
    expect(path).to.be.instanceof(Buffer);
  });

  it('Returns a list of files', async () => {
    const spy = sinon.stub(sftp._client, 'list').returns(file);
    const result = await sftp.list(dir);
    expect(spy.calledOnce).to.be.equal(true);
    expect(result).to.be.equal(file);
  });

  it('Makes a new directory', async () => {
    const spy = sinon.stub(sftp._client, 'mkdir');
    await sftp.mkdir(dir, true);
    expect(spy.calledOnce).to.be.equal(true);
  });

  it('Moves files between two paths', async () => {
    const remotePath = '/remote/path/here/';
    const spy = sinon.stub(Sftp.prototype, 'move');
    await sftp.move(dir, remotePath);
    expect(spy.calledOnce).to.be.equal(true);
    spy.restore();
  });

  it('Puts file to remote directors', async () => {
    const data = Buffer.from('This is my file');
    const spy = sinon.stub(sftp._client, 'put');
    await sftp.put(data, dir);
    expect(spy.calledOnce).to.be.equal(true);
  });

  it('Renames', async () => {
    const remotePath = '/remote/path/here/';
    const spy = sinon.stub(sftp._client, 'rename');
    await sftp.rename(dir, remotePath);
    expect(spy.calledOnce).to.be.equal(true);
  });

  it('Removes a directory', async () => {
    const spy = sinon.stub(sftp._client, 'rmdir');
    await sftp.rmdir(dir, true);
    expect(spy.calledOnce).to.be.equal(true);
  });
});
