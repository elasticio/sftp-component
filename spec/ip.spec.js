const ip = require('../lib/ip.js');

describe('SFTP IP', () => {
  it('IPv4', () => {
    let result;

    runs(() => {
      ip.resolve('127.0.0.1').then((r) => {
        result = r;
      });
    });

    waitsFor(() => result, 'Promise must have returned', 150);

    runs(() => {
      expect(result).toEqual(['127.0.0.1', 4]);
    });
  });

  it('IPv6', () => {
    let result;

    runs(() => {
      ip.resolve('0:0:0:0:0:0:0:1').then((r) => {
        result = r;
      });
    });

    waitsFor(() => result, 'Promise must have returned', 750);

    runs(() => {
      expect(result).toEqual(['0:0:0:0:0:0:0:1', 6]);
    });
  });

  it('Host', () => {
    let result;

    runs(() => {
      ip.resolve('localhost').then((r) => {
        result = r;
      }).done();
    });

    waitsFor(() => result, 'Promise must have returned', 5000);

    runs(() => {
      expect(result).toEqual(['127.0.0.1', 4]);
    });
  });
});
