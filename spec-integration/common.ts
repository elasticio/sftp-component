/* eslint-disable max-len */
/* eslint-disable import/first */
process.env.LOG_LEVEL = 'TRACE';
process.env.LOG_OUTPUT_MODE = 'short';
import { Logger } from '@elastic.io/component-commons-library';
import { existsSync } from 'fs';
import { config } from 'dotenv';
import { mock } from 'node:test';

if (existsSync('.env')) {
  config();
  const { SFTP_HOSTNAME, SFTP_USER, SFTP_PASSWORD, SFTP_PORT } = process.env;
  if (!SFTP_HOSTNAME || !SFTP_USER || !SFTP_PASSWORD || !SFTP_PORT) {
    throw new Error('Please, provide all environment variables');
  }
} else {
  throw new Error('Please, provide environment variables to .env');
}
const { SFTP_HOSTNAME, SFTP_USER, SFTP_PASSWORD, SFTP_PORT } = process.env;

export const creds = {
  host: SFTP_HOSTNAME,
  username: SFTP_USER,
  password: SFTP_PASSWORD,
  port: SFTP_PORT,
};

export const getContext = () => ({
  logger: Logger.getLogger(),
  emit: mock.fn(),
});
