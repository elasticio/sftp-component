var Q = require('q');
var messages = require('elasticio-node').messages;
var client = require('elasticio-rest-node')();
var https = require('https');
var url = require('url');

exports.addS3StreamAttachment = addS3StreamAttachment;

function addS3StreamAttachment(msg, name, stream, contentLength) {
    console.log("About to upload attachment stream of length %s", contentLength);

    return client.resources.s3
        .createSignedUrl()
        .then(onSignedUrl);

    function onSignedUrl(result) {
        console.log("Created signed URL");

        var opts = createRequestOptions(contentLength, result.put_url);

        console.log(result.get_url);

        return uploadFile(stream, opts)
            .then(addUrlAttachment.bind(null, msg, name, result.get_url));
    }
}

function addUrlAttachment(msg, name, url) {

    msg.attachments[name] = {
        url: url
    };

    return Q();
}


function uploadFile(stream, opts){
    var deferred = Q.defer();

    function onRequest(res) {
        res.setEncoding('utf8');

        res.on('data', function(chunk) {
            console.log('BODY: ' + chunk);
        });
        res.on('end', function() {
            console.log('No more data in response.')
            deferred.resolve();
        });
    }

    var req = https.request(opts, onRequest);

    stream.pipe(req);

    return deferred.promise
}

function createRequestOptions(contentLength, putUrl) {

    var opts = url.parse(putUrl);

    opts.method = 'PUT';
    opts.headers = {
        'Content-Length': contentLength
    };

    return opts;
}