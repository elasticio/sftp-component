exports.readFile = function readFile(client, path, cb) {
  const readStream = client.createReadStream(path);
  const chunks = [];
  readStream.on('data', (chunk) => {
    chunks.push(chunk);
  });
  readStream.on('end', () => {
    const buffer = Buffer.concat(chunks);
    cb(null, buffer);
  });
};
