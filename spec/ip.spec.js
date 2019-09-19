const { expect } = require('chai');
const ip = require('../lib/ip.js');

describe('SFTP IP', async () => {
  it('IPv4', async () => {
    let result;
    await ip.resolve('127.0.0.1').then((res) => {
      result = res;
    });

    expect(result).to.deep.equal(['127.0.0.1', 4]);
  });

  it('IPv6', async () => {
    let result;

    await ip.resolve('0:0:0:0:0:0:0:1').then((res) => {
      result = res;
    });
    expect(result).to.deep.equal(['0:0:0:0:0:0:0:1', 6]);
  });

  it('Host', async () => {
    let result;
    await ip.resolve('localhost').then((res) => {
      result = res;
    });
    expect(result).to.deep.equal(['127.0.0.1', 4]);
  });
});
