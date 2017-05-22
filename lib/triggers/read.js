var sftp = require("../sftp.js");
var _ = require("lodash");
var async = require("async");
var messages = require('elasticio-node').messages;
var attachments = require('../attachments.js');

const PROCESSED_FOLDER_NAME = ".elasticio_processed";
const MAX_FILE_SIZE = 10485760;

exports.process = function (msg, cfg) {
    var self = this;

    function onError(e) {
        self.emit('error', e);
    }

    function onEnd() {
        self.emit('end');
    }

    function errorAndEnd(e) {
        onError(e);
        onEnd();
    }

    sftp.connect(cfg, function (err, client) {

        if (err) {
            console.log('An error occurred connecting');
            console.log(err);
            return errorAndEnd(err);
        }

        var dir = cfg.directory || "/";

        if(dir.charAt(0) !== '/') {
            dir = "/" + dir;
        }

        console.log("Opening dir: '%s'", dir);

        client.opendir(dir, function readdir(err, handle) {
            if (err) {
                console.log('An error occurred opening the directory');
                console.log(err);
                sftp.close(client, handle);
                return errorAndEnd(err);
            }
            console.log("Opened dir: '%s'", dir);
            readDir(client, dir, function (err, list) {
                if (err) {
                    sftp.close(client, handle);
                    return errorAndEnd(err);
                }
                console.log('Found following files=%j', list.map((f) => f.filename));
                try {
                    var files = resolveFiles(list, cfg);

                    console.log('Files after filter=%j', files);

                    var processedFolderExist = doesProcessedFolderExist(list);

                    console.log('Processed folder exists?=%s', processedFolderExist);

                    var functions = createReaders(client, dir, files, processedFolderExist, self);

                    async.series(functions,
                        function (err, results) {

                            if (err) {
                                console.log(err);
                            }

                            logProcessedFiled(results);

                            sftp.close(client, handle);

                            onEnd();
                        });
                } catch(e) {
                    console.log('An error occurred looking the directory');
                    console.log(e);
                    sftp.close(client, handle);
                    return errorAndEnd(e);
                }

            });
        });
    });
};

function logProcessedFiled(results) {

    var fileNames = _.map(results, function(next) {
        return next ? next.filename : null;
    });

    console.log("Processed files:", _.filter(fileNames, function(next) {
        return next;
    }));
}

function readDir(client, handle, cb) {
    var result = [];

    readDirContent(client, handle, result, function(err) {
        if (err) {
            console.log('An error occurred in readDir a directory');
            console.log(err);
            return cb(err);
        }

        cb(null, result);
    });
}

function readDirContent(client, handle, result, cb) {

    client.readdir(handle, function (err, list) {
        if (err) {
            console.log('An error occurred reading a directory');
            console.log(err);
            return cb(err);
        }

        _.each(list, function(entry) {
            result.push(entry);
        });

        return cb(null);
    });
}

function doesProcessedFolderExist(files) {

    var result = _.find(files, function (current) {
        return current.filename === PROCESSED_FOLDER_NAME && isDirectory(current);
    });

    return !_.isUndefined(result);
}

function isDirectory(obj) {
    var longname = obj.longname;

    return longname.charAt(0) === "d";
}

function resolveFiles(files, cfg) {

    var candidates = _.filter(files, function (current) {

        var attrs = current.attrs;

        return !isDirectory(current) && attrs.size < MAX_FILE_SIZE;
    });
    console.log('Candidates after filter candidates=%j', candidates);
    return filterFileNames(candidates, cfg);
}

function filterFileNames(files, cfg) {
    var pattern = cfg.pattern || "";

    var regExp = new RegExp(pattern);

    return _.filter(files, function(file) {
        var fileName = file.filename;

        var result = regExp.test(fileName);

        if (!result) {
            console.log("%s does not match pattern: '%s'", fileName, pattern);
        }
        return result;
    });
}

function createReaders(client, dir, files, processedFolderExist, emitter) {
    if (!files || _.isEmpty(files)) {
        return [function (cb) {
            console.log("No files to read");
            cb();
        }];
    }
    return _.map(files, function (file) {
        return function (cb) {
            createMessageForFile(client, dir, file, processedFolderExist, function(err, msg) {
                if (err) {
                    return cb(err);
                }

                emitter.emit('data', msg);

                var result = msg? file : null;

                cb(null, result);
            });
        };
    });
}

 function createMessageForFile(client, dir, file, processedFolderExist, cb) {

    var fileName = file.filename;

    var msg = messages.newMessageWithBody({
        filename: file.filename,
        size: file.attrs.size
    });

    move(client, dir, file, processedFolderExist, function (err, newPath) {

        if(err) {
            console.log('An error occurred moving the files.');
            console.log(err);
            return cb(err);
        }

        var readStream = client.createReadStream(newPath);

        attachments.addS3StreamAttachment(msg, fileName, readStream, file.attrs.size)
            .then(function() {
                cb(null, msg);
            }).done();
    });
}

function move(client, dir, file, processedFolderExist, cb) {

    var fileName = file.filename;

    var oldName = sftp.createPath(dir, fileName);
    var newName = sftp.createPath(dir, PROCESSED_FOLDER_NAME + '/' +fileName + '_' + new Date().getTime());

    createProcessedFolder(client, dir, processedFolderExist, function (err) {
        if (err) {
            console.log('An error occurred creating the processed folder');
            console.log(err);
            return cb(err);
        }

        console.log("About to move %s to %s", oldName, newName);


        client.rename(oldName, newName, function (err) {

            if (err) {
                console.log('An error occurred renaming the file');
                console.log(err);
            }

            console.log("%s successfully moved to %s", oldName, newName);

            cb(err, newName);
        });
    });
}

function createProcessedFolder(client, dir, processedFolderExist, cb) {

    if(processedFolderExist) {
        return cb();
    }

    var path = sftp.createPath(dir, PROCESSED_FOLDER_NAME);

    console.log("'%s' does not exist. About to mkdir.", path);

    client.mkdir(path, {mode:16877}, cb);

}
