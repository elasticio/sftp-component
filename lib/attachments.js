const client = require('elasticio-rest-node')();
const http = require('http');
const url = require('url');

exports.addAttachment = addAttachment;

function addAttachment(msg, name, stream, contentLength) {
  console.log("About to upload attachment stream of length %s", contentLength);

  return client.resources.storage
    .createSignedUrl()
    .then(onSignedUrl);

  function onSignedUrl(result) {
    console.log("Created signed URL=%s", result.get_url);

    const opts = createRequestOptions(contentLength, result.put_url);

    return uploadFile(stream, opts)
      .then(addUrlAttachment.bind(null, msg, name, result.get_url, contentLength))
      .catch(function(rej) { console.log('uploadFile promise has been rejected: ', JSON.stringify(rej)) });
  }
}

function addUrlAttachment(msg, name, url, size) {

  msg.attachments[name] = {
    url: url,
    size: size
  };

  return Promise.resolve();
}


function uploadFile(stream, options) {
  return new Promise((ok, nok) => {
    console.log('Uploading to options=%j', options);
    const req = http.request(options, (res) => {
      console.log(`Status : ${res.statusCode}`);
      console.log(`Headers : ${JSON.stringify(res.headers)}`);
      if (res.statusCode === 200) {
        ok();
      } else {
        nok(new Error({
          "message": "Failed to upload attachment to steward, statusCode=" + res.statusCode,
          "headers": res.headers
        }));
      }
    });
    req.on('error', (e) => {
      console.error(`problem with request: ${e.message}`);
      nok(e);
    });
    stream.pipe(req);
    stream.on('end', () => {
      console.log('Streaming completed');
      req.end();
    });
  });
}

function createRequestOptions(contentLength, putUrl) {

  const opts = url.parse(putUrl);

  opts.method = 'PUT';
  opts.headers = {
    'Content-Length': contentLength
  };

  return opts;
}
