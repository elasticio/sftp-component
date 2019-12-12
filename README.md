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
   * [Read files](#read-files)
   * [Poll files](#poll-files)
* [Actions](#actions)
   * [Upload files](#upload-files)
   * [Download files](#download-files)
   * [Delete file](#delete-file)
   * [Download file by name](#download-file-by-name)
* [Known limitations](#known-limitations)
* [SSH2 SFTP Client API and Documentation links](#ssh2-sftp-client-api-and-documentation-links)

## General Information

### Description and Purpose

This component creates a connection to an SFTP server to read and upload files.

The optional environment variable `MAX_FILE_SIZE` should be set in settings to provide the maximum file size that can be uploaded in **bytes**. The default value for `MAX_FILE_SIZE` is 3.5GB.

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

### Read files

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

### Poll files
Triggers to get all new and updated files since last polling.

The following configuration fields are available:
* **Directory**: The directory of the files to read from.
* **Emit Behaviour**: Options are: default is `Emit Individually` emits each object in separate message, `Fetch All` emits all objects in one message
* **Start Time**: Start datetime of polling. Default min date:`-271821-04-20T00:00:00.000Z`
* **End Time**: End datetime of polling. Default max date: `+275760-09-13T00:00:00.000Z`


#### Expected output metadata
<details> 
<summary>Output metadata</summary>


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
    },
    "type": {
      "title": "File Type",
      "type": "string",
      "required": true
    },
    "modifyTime": {
      "title": "Last Modification Time",
      "type": "number",
      "required": true
    },
    "accessTime": {
      "title": "Last Access Time",
      "type": "number",
      "required": true
    },
    "directory": {
      "title": "Directory",
      "type": "string",
      "required": true
    },
    "path": {
      "title": "Full Path",
      "type": "string",
      "required": true
    }
  }
}
```
</details>

**Note:** `type` field represents type of the file. You can find additional information about Unix file types [below](#ssh2-sftp-client-api-and-documentation-links);

## Actions

### Upload files

The following configuration fields are available:
- **Directory**: The directory where the file will be uploaded to.

* Note: if the directory does not exist, it will create it at the risk of possibly overwriting any files that may have the same name.

Input metadata:

- **Filename**: Custom name for uploaded file.

Notes:
* Uploaded file name will get filename of income file if new `Filename` doesn't provided 
* `Filename` will be added at the beggining of attachment name if income message contains multiple attachments: `[SpecifiedFilename]_[NameOfExistedFile]`
* File will be overwrited in case when file with specified name already exists in directory

### Delete file
Action to delete file by provided full file path.

#### Expected input metadata
```json
{
  "type": "object",
  "properties": {
    "path": {
      "title": "Full Path",
      "type": "string",
      "required": true
    }
  }
}
```

#### Expected output metadata
```json
{
  "type": "object",
  "properties": {
    "id": {
      "title": "Full Path",
      "type": "string",
      "required": true
    }
  }
}

```

### Download file by name
Finds a file by name in the provided directory and uploads (streams) to the attachment storage (a.k.a. steward).
After the upload, the READ-URL of the file will be used to generate a message with content like below:

```json
{
  "id": "0c196dca-4187-4b49-bf90-5cfe9030955b",
  "attachments": {
    "1.txt": {
      "url": "http://steward-service.platform.svc.cluster.local:8200/files/99999-6613-410a-9da8-c5f6d529b683",
      "size": 7
    }
  },
  "body": {
    "type": "-",
    "name": "1.txt",
    "size": 7,
    "modifyTime": "2019-12-02T13:05:42.000Z",
    "accessTime": "2019-12-04T14:14:54.000Z",
    "rights": {
      "user": "rw",
      "group": "r",
      "other": "r"
    },
    "owner": 1002,
    "group": 1002,
    "attachment_url": "http://steward-service.platform.svc.cluster.local:8200/files/99999-6613-410a-9da8-c5f6d529b683",
    "directory": "/www/olhav",
    "path": "/www/olhav/1.txt"
  }
}
```

The next component may read from `url` in `attachments` for a memory-efficient way to read/parse data. 

#### List of Expected Config fields
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
    "path": {
      "title": "Path and File Name",
      "type": "string"
    }
  }
}
```

#### Expected output metadata

<details> 
<summary>Output metadata</summary>

```json

{
  "type": "object",
  "properties": {
    "type": {
      "title": "Type",
      "type": "string",
      "required": true
    },
    "name": {
      "title": "File Name",
      "type": "string",
      "required": true
    },
    "size": {
      "title": "File Size",
      "type": "number",
      "required": true
    },
    "modifyTime": {
      "title": "modifyTime",
      "type": "string",
      "required": true
    },
    "accessTime": {
      "title": "accessTime",
      "type": "string",
      "required": true
    },
    "directory": {
      "title": "directory",
      "type": "string",
      "required": true
    },
    "path": {
      "title": "path",
      "type": "string",
      "required": true
    },
    "attachment_url": {
      "title": "File Size",
      "type": "number",
      "required": true
    }
  }
}

```
</details>

**Note:** `type` field represents type of the file. You can find additional information about Unix file types [below](#ssh2-sftp-client-api-and-documentation-links);

### Download files
Finds a file by criterias in the provided directory and uploads (streams) to the attachment storage (a.k.a. steward).
After the upload, the READ-URL of the file will be used to generate a message with content like below:

```json
{
  "id": "0c196dca-4187-4b49-bf90-5cfe9030955b",
  "attachments": {
    "1.txt": {
      "url": "http://steward-service.platform.svc.cluster.local:8200/files/99999-6613-410a-9da8-c5f6d529b683",
      "size": 7
    }
  },
  "body": {
    "type": "-",
    "name": "1.txt",
    "size": 7,
    "modifyTime": "2019-12-02T13:05:42.000Z",
    "accessTime": "2019-12-04T14:14:54.000Z",
    "rights": {
      "user": "rw",
      "group": "r",
      "other": "r"
    },
    "owner": 1002,
    "group": 1002,
    "attachment_url": "http://steward-service.platform.svc.cluster.local:8200/files/99999-6613-410a-9da8-c5f6d529b683",
    "directory": "/www/test",
    "path": "/www/test/1.txt"
  }
}
```

The next component may read from `url` in `attachments` for a memory-efficient way to read/parse data. 

#### List of Expected Config fields
##### Behavior
`Fetch All` - fetch all objects in one message in form of array, `Emit Individually` - emit each fetched object as separate message.
##### Number of search terms
Not required field, number of search terms. Determines the number of search terms that the entity must match. Need to be an integer value from 1 to 99. If this field is empty, action emits all entities with selected type.
##### Upload files to attachment
 Not required field. If `Yes` - all files will be downloaded to the attachments and action will return files metadata as JSON object. If `No` - No files will be downloaded to the attachments and action returns files metadata in JSON object


#### Expected input metadata
**Directory Path** - required field, Path of lookup directory.
**Max Size** - Maximum number of objects to fetch. Default `250`, maximum value is `250`. 

Metadata is depending on the input field `Number of search terms`. 

If `Number of search terms` is empty, metadata does not exist.

If `Number of search terms` = 1, metadata has only one search term.

If `Number of search terms` > 1, metadata has a number of search term equal `Number of search terms` and a number of criteria link equal '`Number of search terms` - 1'.

Each search term has 3 fields:
 ![image](https://user-images.githubusercontent.com/13310949/70321165-54980580-182f-11ea-9442-e6234163deb6.png)
 - **Field Name** - chosen entity's field name. You need to select the one field from `Value` section:
 ![image](https://user-images.githubusercontent.com/13310949/70224021-31992300-1755-11ea-83e0-6023a2d67503.png)
 - **Condition** - You need to select the one condition from `Value` section:
 ![image](https://user-images.githubusercontent.com/13310949/70224020-31992300-1755-11ea-8f5d-375a77acf1c6.png)
 - **Field Value** - the value that the field must match with the specified condition.
  
  You can use wildcard in the condition value for the `like` operator. See [micromatch documentation.](https://www.npmjs.com/package/micromatch)

Between search terms, there is **Criteria Link**. You need to select the one criteria from `Value` section:
![image](https://user-images.githubusercontent.com/13310949/70224278-ae2c0180-1755-11ea-9445-441a0e2c8f87.png)
`And` Criteria Link has precedence over `Or`. If you configure 3 search Terms:
```iso92-sql
 searchTerm1 and SearchTerm2 or SearchTerm3
```
, it will be executed as
 ```iso92-sql
(searchTerm1 and SearchTerm2) or SearchTerm3                       
```

For example, if you want to find all files where field `name` starts from `123` or field `size` grater than `10000`:
![image](https://user-images.githubusercontent.com/13310949/70224450-f6e3ba80-1755-11ea-9a9c-de573f74d370.png)


#### Output metadata

Schema of output metadata depends on Behaviour configuration: 
##### Fetch All
<details> 
<summary>Output metadata</summary>

```json
{
   "type": "object",
   "properties": {
      "results": {
         "type": "array",
         "properties": {
            "type": "object",
            "properties": {
               "type": {
                  "type": "string"
               },
               "name": {
                  "type": "string"
               },
               "size": {
                  "type": "number"
               },
               "modifyTime": {
                  "type": "number"
               },
               "accessTime": {
                  "type": "number"
               },
               "rights": {
                  "type": "object",
                  "properties": {
                     "user": {
                        "type": "string"
                     },
                     "group": {
                        "type": "string"
                     },
                     "other": {
                        "type": "string"
                     }
                  }
               },
               "owner": {
                  "type": "number"
               },
               "group": {
                  "type": "number"
               },
               "attachment_url": {
                  "type": "string"
               },
               "directory": {
                  "type": "string"
               },               
               "path": {
                  "type": "string"
               }
            }
         }
      }
   }
}
```
</details>

##### Emit Individually
<details>
<summary>Output metadata</summary>

```json
{
   "type": "object",
   "properties": {
      "type": {
         "type": "string"
      },
      "name": {
         "type": "string"
      },
      "size": {
         "type": "number"
      },
      "modifyTime": {
         "type": "number"
      },
      "accessTime": {
         "type": "number"
      },
      "rights": {
         "type": "object",
         "properties": {
            "user": {
               "type": "string"
            },
            "group": {
               "type": "string"
            },
            "other": {
               "type": "string"
            }
         }
      },
      "owner": {
         "type": "number"
      },
      "group": {
         "type": "number"
      },
      "attachment_url": {
         "type": "string"
      },
      "directory": {
          "type": "string"
      },               
      "path": {
          "type": "string"
      }
   }
}
```
</details>

`type` field represents type of the file. You can find additional information about Unix file types [below](#ssh2-sftp-client-api-and-documentation-links);

#### Known limitations
Action does not support `Fetch Page` mode (according to OIH standards)


## Known limitations

* The maximum file size accepted by the SFTP component is limited to 100 MB.
* The attachments mechanism does not work with [Local Agent Installation](https://support.elastic.io/support/solutions/articles/14000076461-announcing-the-local-agent-)
* `Get new and updated files` trigger mechanism is based on SFTP file `modifyTime` metadata field. For correct processing the trigger requires correct time configuration on the SFTP server.
* `Get new and updated files` trigger does not support empty files processing.
* `Get new and updated files` trigger does not support `fetch page` Emit Behaviour

## SSH2 SFTP Client API and Documentation links

The SFTP component uses [ssh2-sftp-client](https://www.npmjs.com/package/ssh2-sftp-client).

Explanation of [Unix file types](https://en.wikipedia.org/wiki/Unix_file_types)
