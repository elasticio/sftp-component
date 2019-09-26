const { AttachmentProcessor } = require('@elastic.io/component-commons-library');

async function addAttachment(msg, name, stream, contentLength) {
  // eslint-disable-next-line no-return-await
  return await new AttachmentProcessor().uploadAttachment(stream, 'stream')
    .then(async (result) => {
      // eslint-disable-next-line no-param-reassign
      msg.attachments[name] = {
        url: result.config.url,
        size: contentLength,
      };
    })
    .catch((e) => this.emit('error', e));
}

exports.addAttachment = addAttachment;
