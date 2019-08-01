var ip = require('../lib/ip.js');

describe('SFTP IP', function () {

    it('IPv4', function () {

        var result;

        runs(function () {
            ip.resolve('127.0.0.1').then(function (r) {
                result = r;
            });
        });

        waitsFor(function () {
            return result;
        }, 'Promise must have returned', 150);

        runs(function () {
            expect(result).toEqual(['127.0.0.1', 4]);
        });

    });

    it('IPv6', function () {

        var result;

        runs(function () {
            ip.resolve('0:0:0:0:0:0:0:1').then(function (r) {
                result = r;
            });
        });

        waitsFor(function () {
            return result;
        }, 'Promise must have returned', 750);

        runs(function () {
            expect(result).toEqual(['0:0:0:0:0:0:0:1', 6]);
        });

    });

    it('Host', function () {

        var result;

        runs(function () {
            ip.resolve('localhost').then(function (r) {
                result = r;
            }).done();
        });

        waitsFor(function () {
            return result;
        }, 'Promise must have returned', 5000);

        runs(function () {
            expect(result).toEqual(['127.0.0.1', 4]);
        });

    });
});
