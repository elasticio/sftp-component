const client = require('elasticio-rest-node')();
const http = require('http');
const url = require('url');

function createRequestOptions(contentLength, putUrl) {
  const opts = url.parse(putUrl);

  opts.method = 'PUT';
  opts.headers = {
    'Content-Length': contentLength,
  };
  return opts;
}

function uploadFile(stream, options) {
  return new Promise((ok, nok) => {
    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        ok();
      } else {
        nok(new Error({
          message: `Failed to upload attachment to steward, statusCode=${res.statusCode}`,
          headers: res.headers,
        }));
      }
    });
    req.on('error', (e) => {
      nok(e);
    });
    stream.pipe(req);
    stream.on('end', () => {
      req.end();
    });
  });
}

async function addUrlAttachment(msg, name, url2, size) {
  // eslint-disable-next-line no-param-reassign
  msg.attachments[name] = {
    url: url2,
    size,
  };
}

function addAttachment(msg, name, stream, contentLength) {
  return client.resources.storage
    .createSignedUrl()
    .then((result) => {
      const opts = createRequestOptions(contentLength, result.put_url);

      return uploadFile(stream, opts)
        .then(addUrlAttachment.bind(null, msg, name, result.get_url, contentLength));
    });
}

exports.addAttachment = addAttachment;
