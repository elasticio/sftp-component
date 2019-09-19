describe('SFTP Verify Credentials', () => {
  const verifyCredentials = require('../verifyCredentials.js');
  const sftp = require('../lib/sftp.js');

  let verifyCallback;


  beforeEach(() => {
    verifyCallback = jasmine.createSpy('verifyCallback');

    spyOn(sftp, 'close').andCallFake(() => {
    });
  });


  it('should verify successfully', () => {
    spyOn(sftp, 'connect').andCallFake((cfg, callback) => {
      callback(null, {});
    });


    runAndWait(
      () => {
        verifyCredentials({}, verifyCallback);
      },
      () => verifyCallback.calls.length > 0,
      () => {
        expect(sftp.connect).toHaveBeenCalledWith({}, jasmine.any(Function));

        expect(sftp.close).toHaveBeenCalled();

        expect(verifyCallback).toHaveBeenCalledWith(null, { verified: true });
      },
    );
  });

  it('should not verify if connection failed', () => {
    spyOn(sftp, 'connect').andCallFake((cfg, callback) => {
      callback(new Error('Connection error'));
    });


    runAndWait(
      () => {
        verifyCredentials({}, verifyCallback);
      },
      () => verifyCallback.calls.length > 0,
      () => {
        expect(sftp.connect).toHaveBeenCalledWith({}, jasmine.any(Function));

        expect(sftp.close).not.toHaveBeenCalled();

        expect(verifyCallback).toHaveBeenCalledWith(jasmine.any(Error));
      },
    );
  });


  var runAndWait = function (runner, waiter, expector) {
    runs(runner);

    waitsFor(waiter, 'Next must have been called', 500);

    runs(expector);
  };
});
