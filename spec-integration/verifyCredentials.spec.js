/* eslint-disable no-unused-expressions */
const { getLogger } = require('@elastic.io/component-commons-library/lib/lib/logger/logger');
const { expect } = require('chai');
const sinon = require('sinon');
const verifyCredentials = require('../verifyCredentials');
require('dotenv').config();

const logger = getLogger();

describe('verifyCredentials', () => {
  const spy = sinon.spy();
  let credentials;

  before(() => {
    credentials = {
      host: process.env.SFTP_HOSTNAME,
      port: Number(process.env.PORT),
      username: process.env.SFTP_USER,
      password: process.env.SFTP_PASSWORD,
    };
  });

  afterEach(() => {
    spy.resetHistory();
  });

  it('verifies authentic credentials successfully', async () => {
    const cbObj = await verifyCredentials.call(
      {
        emit: spy,
        logger,
      },
      credentials,
      (_, verifiedObj) => verifiedObj,
    );
    expect(cbObj.verified).to.be.true;
  });

  it('verifies authentic credentials with private key successfully', async () => {
    const credentialsWithKey = {
      host: process.env.SFTP_HOSTNAME,
      port: Number(process.env.PORT),
      username: process.env.SFTP_USER,
      privateKey: process.env.SFTP_KEY.replace(/\\n/g, '\n'),
    };
    const cbObj = await verifyCredentials.call(
      {
        emit: spy,
        logger,
      },
      credentialsWithKey,
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
        logger,
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
        logger,
      },
      incorrectPortCredentials,
      (_, verifiedObj) => verifiedObj,
    );
    expect(cbObj.verified).to.be.false;
  });
});
