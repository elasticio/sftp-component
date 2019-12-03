# SFTP Component [![CircleCI](https://circleci.com/gh/elasticio/sftp-component.svg?style=svg)](https://circleci.com/gh/elasticio/sftp-component)

## Table of Contents
* [General information](#general-information)
   * [Description and Purpose](#description-and-purpose)
* [Credentials](#credentials)
     * [User Name](#user-name)
     * [Password](#password)
     * [Host](#host)
     * [Port](#port)
* [Triggers](#triggers)
   * [Read](#read)
* [Actions](#actions)
   * [Upload](#upload)
   * [Upsert File By Name](#upsert-file-by-name)
   * [Lookup file by name](#Lookup-file-by-name)
* [Known limitations](#known-limitations)
* [SSH2 SFTP Client API and Documentation links](#ssh2-sftp-client-api-and-documentation-links)

## General Information

### Description and Purpose

This component creates a connection to an SFTP server to read and upload files.

## Credentials
### User Name
Username for SFTP server
### Password
Password for SFTP server
### Host
Host name of SFTP server
### Port
Optional, port of SFTP server. Defaults to 22 if not set.

![image](https://user-images.githubusercontent.com/35310862/65412296-3a818600-ddef-11e9-9064-8b9db7a650d5.png)

## Triggers

### Read

The following configuration fields are available:
* **Directory**: The directory of the files to read from.
* **Pattern**: Optional regex pattern for file names. If no pattern is given, no matching is done.

After a file is found:
 * It is moved to the (hidden) directory `.elasticio_processed`
 * It is pulled and uploaded (streamed) to the attachment storage (a.k.a. steward)
 * After the upload, the READ-URL of the file will be used to generate a message with content like below:

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

The next component may read from `url` in `attachments` for a memory-efficient way to read/parse data. Please note that if multiple files are found, SFTP component will generate one message per file.

* Note: you may need to consider cleaning up the `.elasticio_processed` directory manually

## Actions

### Upload

The following configuration fields are available:
|* **Directory**: The directory where the file will be uploaded to.

* Note: if the directory does not exist, it will create it at the risk of possibly overwriting any files that may have the same name.

Input metadata:

- **Filename**: Custom name for uploaded file.

### Upsert File By Name
Given a filename and a URL to an attachment stored in the platform, transfers the contents of the attachment to the file.  The component returns a summary of the written file.

The following configuration fields are available:

- **Behavior When File Already Exists**: The expected behavior of the component when trying to write to a file that already exists

  - **Throw an Error**: Does not write data to the file and the component produces an error
  - **Overwrite the File**: Replace the existing file contents with the contents of the attachment stored in the platform.
  - **Append the File Contents**: Adds the contents of the attachment stored in the platform to the end of the file. No intermediate characters (e.g. newlines or spaces) will be added.

* Note: If the filename provided contains directories that do not exist, those directories will be created.

Input metadata:

- **File Name and Path**: Full filename and path to the file to write.  Both absolute (e.g. `/home/myuser/somefolder/some.file`) and relative (e.g. `./somefolder/some.file`) paths are supported.  Tilde (`~`) expansion is not supported.
- **Attachment URL**: URL of the stored attachment to store in the file.

### Lookup file by name
Finds a file by name in the provided directory and uploads (streams) to the attachment storage (a.k.a. steward).
After the upload, the READ-URL of the file will be used to generate a message with content like below:

```json
{
  "id": "b94d787a-eaab-4cf9-b80c-dcf6aa6d7db1",
  "body": {
    "size": 6,
    "filename": "1.txt"
  },
  "attachments": {
    "1.txt": {
      "size": 6,
      "url": "http://steward-service.platform.svc.cluster:8200/files/b94d787a-eaab-4cf9-b80c-dcf6aa6d7db1"
    }
  },
  "headers": {},
  "metadata": {}
}
```

The next component may read from `url` in `attachments` for a memory-efficient way to read/parse data. 

#### List of Expected Config fields
##### Directory
The directory of the files to lookup and read from.
##### Allow Empty Result
Default `No`. In case `No` is selected - an error will be thrown when no objects were found,
If `Yes` is selected -  an empty object will be returned instead of throwing an error.

##### Allow ID to be Omitted
Default `No`. In case `No` is selected - an error will be thrown when object id is missing in metadata, if `Yes` is selected - an empty object will be returned instead of throwing an error.

#### Expected input metadata
```json
{
  "type": "object",
  "properties": {
    "filename": {
      "title": "File Name",
      "type": "string"
    }
  }
}
```

#### Expected output metadata
```json
{
  "type": "object",
  "properties": {
    "filename": {
      "title": "File Name",
      "type": "string",
      "required": true
    },
    "size": {
      "title": "File Size",
      "type": "number",
      "required": true
    }
  }
}

```

## Known limitations

* The maximum file size accepted by the SFTP component is limited to 100 MiB (Mebibytes)
* The attachments mechanism does not work with [Local Agent Installation](https://support.elastic.io/support/solutions/articles/14000076461-announcing-the-local-agent-)

## SSH2 SFTP Client API and Documentation links

The SFTP component uses [ssh2-sftp-client](https://www.npmjs.com/package/ssh2-sftp-client).
