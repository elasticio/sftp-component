/* eslint-disable no-unused-expressions */
const { getLogger } = require('@elastic.io/component-commons-library');
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
    const result = await verifyCredentials.call(
      {
        emit: spy,
        logger,
      },
      credentials,
    );
    expect(result.verified).to.be.true;
  });

  it('verifies authentic credentials with private key successfully', async () => {
    const credentialsWithKey = {
      host: process.env.SFTP_HOSTNAME,
      port: Number(process.env.PORT),
      username: process.env.SFTP_USER,
      privateKey: process.env.SFTP_KEY.replace(/\\n/g, '\n'),
    };
    const result = await verifyCredentials.call(
      {
        emit: spy,
        logger,
      },
      credentialsWithKey,
    );
    expect(result.verified).to.be.true;
  });

  it('fails to verify credentials with an incorrect password', async () => {
    const incorrectPasswordCredentials = JSON.parse(JSON.stringify(credentials));
    incorrectPasswordCredentials.password = 'IncorrectPassword';
    const result = await verifyCredentials.call(
      {
        emit: spy,
        logger,
      },
      incorrectPasswordCredentials,
    );
    expect(result.verified).to.be.false;
  });

  it('fails to verify credentials with an incorrect port', async () => {
    const incorrectPortCredentials = JSON.parse(JSON.stringify(credentials));
    incorrectPortCredentials.port += 1;
    const result = await verifyCredentials.call(
      {
        emit: spy,
        logger,
      },
      incorrectPortCredentials,
    );
    expect(result.verified).to.be.false;
  });
});
