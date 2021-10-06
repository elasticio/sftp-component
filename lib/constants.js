module.exports = {
  DIR: 'directoryPath',
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE * 1024 * 1024 || 104857600, // 100 MiB
  READY_TIMEOUT: Number(process.env.READY_TIMEOUT) || 10000,
};
