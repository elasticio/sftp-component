/* eslint-disable no-unused-expressions */
const bunyan = require('bunyan');
const { expect } = require('chai');
const sinon = require('sinon');
const verifyCredentials = require('../verifyCredentials');
require('dotenv').config();

describe('verifyCredentials', function () {
  this.timeout(10000);

  const spy = sinon.spy();
  let credentials;

  before(() => {
    credentials = {
      host: process.env.HOSTNAME,
      port: Number(process.env.PORT),
      username: process.env.USER,
      password: process.env.PASSWORD,
    };
  });

  afterEach(() => {
    spy.resetHistory();
  });

  it('verifies authentic credentials successfully', async () => {
    const cbObj = await verifyCredentials.call(
      {
        emit: spy,
        logger: bunyan.createLogger({ name: 'dummy' }),
      },
      credentials,
      (_, verifiedObj) => verifiedObj,
    );
    expect(cbObj.verified).to.be.true;
  });

  it('fails to verify credentials with an incorrect password', async () => {
    const incorrectPasswordCredentials = JSON.parse(JSON.stringify(credentials));
    incorrectPasswordCredentials.password = 'IncorrectPassword';
    const cbObj = await verifyCredentials.call(
      {
        emit: spy,
        logger: bunyan.createLogger({ name: 'dummy' }),
      },
      incorrectPasswordCredentials,
      (_, verifiedObj) => verifiedObj,
    );
    expect(cbObj.verified).to.be.false;
  });

  it('fails to verify credentials with an incorrect port', async () => {
    const incorrectPortCredentials = JSON.parse(JSON.stringify(credentials));
    incorrectPortCredentials.port += 1;
    const cbObj = await verifyCredentials.call(
      {
        emit: spy,
        logger: bunyan.createLogger({ name: 'dummy' }),
      },
      incorrectPortCredentials,
      (_, verifiedObj) => verifiedObj,
    );
    expect(cbObj.verified).to.be.false;
  });
});
