const { AttachmentProcessor } = require('@elastic.io/component-commons-library');

async function addAttachment(msg, name, stream, contentLength) {
  try {
    const result = await new AttachmentProcessor().uploadAttachment(stream, 'stream');
    // eslint-disable-next-line no-param-reassign
    msg.attachments[name] = {
      url: result.config.url,
      size: contentLength,
    };
  } catch (e) {
    this.emit('error', e);
  }
}

exports.addAttachment = addAttachment;
