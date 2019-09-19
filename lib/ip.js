const dns = require('dns');
const net = require('net');
const Q = require('q');

const resolve = function (input) {
  console.log('Resolving IP for', input);

  const family = net.isIP(input);

  if (family != 0) {
    return Q.fcall(() => [input, family]);
  }

  console.log('About to resolve IP for host ', input);

  return Q.nfcall(dns.lookup, input);
};

exports.resolve = resolve;
