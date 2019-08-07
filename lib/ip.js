const dns = require('dns');
const net = require('net');
const Q = require('q');

exports.resolve = function resolve(input) {
    console.log('Resolving IP for', input);

    const family = net.isIP(input);

    if (family !== 0) {
        return Q.fcall(() => [input, family]);
    }

    console.log('About to resolve IP for host ', input);

    return Q.nfcall(dns.lookup, input);
};
