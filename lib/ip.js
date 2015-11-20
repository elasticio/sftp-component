var dns = require("dns");
var net = require("net");
var Q = require('q');

var resolve = function (input) {
    console.log("Resolving IP for", input);

    var family = net.isIP(input);

    if (family != 0) {
        return Q.fcall(function () {
            return [input, family];
        });
    }

    console.log("About to resolve IP for host ", input);

    return Q.nfcall(dns.lookup, input);
};

exports.resolve = resolve;