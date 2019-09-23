[![CircleCI](https://circleci.com/gh/elasticio/sftp-component.svg?style=svg)](https://circleci.com/gh/elasticio/sftp-component)
# sftp-component
## Table of Contents

* [General information](#general-information)
   * [Description and Purpose](#description-and-purpose)
   * [How it works](#how-it-works)
* [Credentials](#credentials)
* [Triggers](#triggers)
   * [Read](#read)
* [Actions](#actions)
   * [Upload](#upload)
* [Additional info](#additional-info)
* [Other Limitations](#other-limitations)
* [API and Documentation links](#api-and-documentation-links)

## General information
### Description and Purpose
This component creates a connection to an SFTP server to read and upload files.

### How it works
In this component you have the following trigger:
* READ: read takes a directory path and optional pattern match to file name, and will return matching files in said directory
The following action is available:
* UPLOAD: upload a file to a given directory location

### Credentials

The following are the credential fields are used for SFTP:

![image](https://user-images.githubusercontent.com/35310862/65412296-3a818600-ddef-11e9-9064-8b9db7a650d5.png)

The port will default to 22 if not set.

## Triggers
### Read
The following configuration fields are available:
* DIRECTORY: The directory path of the files you would like to read from
* PATTERN: Optional pattern match for file name
The Read trigger will return the files that match the pattern, or all files in the directory if no pattern is given.

#### Known Limitations
The directories do not currently have an option to be parsed through recursively

## Actions
### Upload
The following configuration fields are available:
* DIRECTORY: The directory path to where you want to upload the file
The Upload action will upload a file into the given directory.

#### Known Limitations
If the directory path does not exist, it will create it, at the risk of possibly overwriting any files that may have the same name.

## Additional info
After file is found on SFTP it does following:
 * It moves the file to the (hidden) ``.elasticio_processed`` directory
 * It pulls it and upload (stream) the file to the attachment storage (aka. steward)
 * After upload is completed, READ-URL of the file will be used to generate one message with the content like below:

```json
{
  "id": "5e00ca80-f2a3-11e6-9fdd-e7b75b43e28b",
  "attachments": {
    "large.xml": {
      "url": "https://steward.eio.cloud/foo&Signature=5%2FsrvmbGGfVoYpKeMH3ugaEL"
    }
  },
  "body": {
    "filename": "large.xml",
    "size": 2508908
  }
}
```

next component may just read from the URL in attachment in oder to get the memory efficient way to read/parse data. 
Please note that if multiple files are found, SFTP component will generate one message per file.

> NOTE: you may need to consider cleaning up the ``.elasticio_processed`` directory manually

## Other Limitations

Currently the maximum file size that is accepted by SFTP component is limited to
100 MiB, see
[here](https://github.com/elasticio/sftp-component/blob/master/lib/triggers/read.js#L8)
for more information

Attachments limitations:

1. Maximal possible size for an attachment is 100 MiB.
2. Attachments mechanism does not work with [Local Agent Installation](https://support.elastic.io/support/solutions/articles/14000076461-announcing-the-local-agent-)

## Documentation links
Uses the [ssh2-sftp-client](https://www.npmjs.com/package/ssh2-sftp-client)