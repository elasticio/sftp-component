const getEnvNumber = (name, defaultValue: number) => {
  const value = process?.env?.[name];
  return value !== undefined ? Number(value) : defaultValue;
};

// Units
const MB = 1024 * 1024;

// Exported constants
export const MAX_FILE_SIZE = getEnvNumber('MAX_FILE_SIZE', 100) * MB; // 100 MB default
export const MAX_MESSAGE_SIZE = getEnvNumber('MAX_MESSAGE_SIZE', 10) * MB;// 10 MB default
export const OPERATION_RETRY_MAX_ATTEMPTS = getEnvNumber('OPERATION_RETRY_MAX_ATTEMPTS', 5);
export const OPERATION_RETRY_BASE_DELAY = getEnvNumber('OPERATION_RETRY_BASE_DELAY', 500); // ms
export const OPERATION_TIMEOUT = getEnvNumber('OPERATION_TIMEOUT', 10000); // ms
export const CONNECTION_RETRY_MAX_ATTEMPTS = getEnvNumber('CONNECTION_RETRY_MAX_ATTEMPTS', 5);
export const CONNECTION_RETRY_BASE_DELAY = getEnvNumber('CONNECTION_RETRY_BASE_DELAY', 500); // ms
export const AUTO_DISCONNECT_TIMEOUT_MS = getEnvNumber('AUTO_DISCONNECT_TIMEOUT_MS', 15000); // ms
export const TMP_DATA_PATH = '/tmp/data';
