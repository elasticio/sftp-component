const verifyCredentials = require('../verifyCredentials.js');
const sftp = require('../lib/sftp.js');
const expect = require('chai').expect;
const sinon = require('sinon');

let verifyCallback = {};

describe("SFTP Verify Credentials", function () {

    afterEach(() => {
        sinon.reset();
    });


    it('should verify successfully', async function () {

         sinon.stub(sftp, 'connect').callsFake(function (cfg, callback) {
            callback(null, {});
        });

         await verifyCredentials({}, verifyCallback);

       //  expect(sftp.connect).toHaveBeenCalledWith({}, jasmine.any(Function));
         expect(sftp.close).toHaveBeenCalled();
         expect(verifyCallback).toHaveBeenCalledWith(null, {verified: true});

    });

    it('should not verify if connection failed', async function () {

        sinon.stub(sftp, 'connect').callsFake(function (cfg, callback) {
            callback(new Error("Connection error"));
        });

        await verifyCredentials({}, verifyCallback);

        // expect(sftp.connect).toHaveBeenCalledWith({}, jasmine.any(Function));

        expect(sftp.close).not.toHaveBeenCalled();

        expect(verifyCallback).toHaveBeenCalledWith(jasmine.any(Error));

    });
});
