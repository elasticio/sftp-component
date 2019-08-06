// 'use-strict';
// const ip = require('../lib/ip.js');
// const expect = require('chai').expect;
//
// describe('SFTP IP', async () => {
//     it('IPv4', async () => {
//         let result;
//         await ip.resolve('127.0.0.1').then((r) => {
//             result = r;
//         });
//
//         expect(result).to.deep.equal(['127.0.0.1', 4]);
//
//     });
//
//     it('IPv6', async () => {
//         let result;
//
//         await ip.resolve('0:0:0:0:0:0:0:1').then((r) => {
//             result = r;
//         });
//         expect(result).to.deep.equal(['0:0:0:0:0:0:0:1', 6]);
//
//     });
//
//     it('Host', async () => {
//         let result;
//         await ip.resolve('localhost').then((r) => {
//             result = r;
//         });
//         expect(result).to.deep.equal(['127.0.0.1', 4]);
//
//     });
// });
