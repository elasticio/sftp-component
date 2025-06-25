/* eslint-disable import/first */
process.env.LOG_OUTPUT_MODE = 'short';
process.env.API_RETRY_DELAY = '0';
import { Logger } from '@elastic.io/component-commons-library';
import { mock } from 'node:test';

export const getContext = () => ({
  logger: Logger.getLogger(),
  emit: mock.fn(),
});

export class StatusCodeError extends Error {
  response: any;

  constructor(status) {
    super('');
    this.response = { status };
    this.message = 'StatusCodeError';
  }
}

export const creds = {
  password: '123',
};
