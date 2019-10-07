const { expect } = require('chai');
const ip = require('../lib/ip');

describe('SFTP IP', async () => {
  it('IPv4', async () => {
    const result = await ip.resolve('127.0.0.1');
    expect(result).to.deep.equal(['127.0.0.1', 4]);
  });

  it('IPv6', async () => {
    const result = await ip.resolve('0:0:0:0:0:0:0:1');
    expect(result).to.deep.equal(['0:0:0:0:0:0:0:1', 6]);
  });

  it('Host', async () => {
    const result = await ip.resolve('localhost');
    expect(result).to.deep.equal(['127.0.0.1', 4]);
  });
});
