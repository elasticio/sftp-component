describe("SFTP Verify Credentials", function () {

  var verifyCredentials = require('../verifyCredentials.js');
  var sftp = require('../lib/sftp.js');

  var verifyCallback;


  beforeEach(function () {
    verifyCallback = jasmine.createSpy('verifyCallback');

    spyOn(sftp, 'close').andCallFake(function () {
    });
  });


  it('should verify successfully', function () {

    spyOn(sftp, 'connect').andCallFake(function (cfg, callback) {
      callback(null, {});
    });


    runAndWait(
      function () {
        verifyCredentials({}, verifyCallback);
      },
      function () {
        return verifyCallback.calls.length > 0;
      },
      function () {
        expect(sftp.connect).toHaveBeenCalledWith({}, jasmine.any(Function));

        expect(sftp.close).toHaveBeenCalled();

        expect(verifyCallback).toHaveBeenCalledWith(null, { verified: true });
      }
    );
  });

  it('should not verify if connection failed', function () {

    spyOn(sftp, 'connect').andCallFake(function (cfg, callback) {
      callback(new Error("Connection error"));
    });


    runAndWait(
      function () {
        verifyCredentials({}, verifyCallback);
      },
      function () {
        return verifyCallback.calls.length > 0;
      },
      function () {
        expect(sftp.connect).toHaveBeenCalledWith({}, jasmine.any(Function));

        expect(sftp.close).not.toHaveBeenCalled();

        expect(verifyCallback).toHaveBeenCalledWith(jasmine.any(Error));
      }
    );
  });


  var runAndWait = function (runner, waiter, expector) {

    runs(runner);

    waitsFor(waiter, "Next must have been called", 500);

    runs(expector);
  };
});
