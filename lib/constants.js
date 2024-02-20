module.exports = {
  DIR: 'directoryPath',
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE * 1024 * 1024 || 104857600, // 100 MiB
  MAX_MESSAGE_SIZE: 10485760, // 10 MiB
};
