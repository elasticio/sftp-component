const dns = require('dns');
const net = require('net');
const Q = require('q');

exports.resolve = function resolve(input) {
  const family = net.isIP(input);

  if (family !== 0) {
    return Q.fcall(() => [input, family]);
  }

  return Q.nfcall(dns.lookup, input);
};
