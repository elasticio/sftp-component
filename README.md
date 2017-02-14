# sftp-component
SFTP component for the elastic.io platform

![image](https://cloud.githubusercontent.com/assets/56208/22926023/33899f22-f2ab-11e6-9e2b-3736a2e135ac.png)

## How to use it

Essentialy this component has only one trigger that will regularly pull SFTP location of your choice.

### Authentication

Credentials of SFTP component looks like this:

![image](https://cloud.githubusercontent.com/assets/56208/22926055/58c8d924-f2ab-11e6-8c79-434ba8db9a36.png)


fields above are self-explaining

### Configuration

After configuring (and verifying) the credentials you should configure incoming folder (mandatory). Optionally

### How it works

After file is found on SFTP it is pulled and uploaded (streamed) to attachment storage (aka. steward) and will
generate one message per file with following structure:

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
