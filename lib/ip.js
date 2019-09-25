const dns = require('dns');
const net = require('net');

function lookup(input) {
  return new Promise((resolve, reject) => {
    dns.lookup(input, (err, address, family) => {
      if (err) {
        reject(err);
      }
      resolve([address, family]);
    });
  });
}

exports.resolve = async function resolve(input) {
  const family = net.isIP(input);

  if (family !== 0) {
    return [input, family];
  }
  return lookup(input);
};
