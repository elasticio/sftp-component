const axios = require('axios');
const restNodeClient = require('elasticio-rest-node')();

const REQUEST_TIMEOUT = 921600000;
const REQUEST_MAX_RETRY = 2;
const REQUEST_RETRY_DELAY = 921600000;
const REQUEST_MAX_CONTENT_LENGTH = 921600000;

module.exports.AttachmentProcessor = class AttachmentProcessor {
  async getAttachment(url, responseType) {
    const ax = axios.create();
    AttachmentProcessor.addRetryCountInterceptorToAxios(ax);

    const axConfig = {
      url,
      responseType,
      method: 'get',
      timeout: REQUEST_TIMEOUT,
      retry: REQUEST_MAX_RETRY,
      delay: REQUEST_RETRY_DELAY,
    };

    return ax(axConfig);
  }

  async uploadAttachment(body) {
    const putUrl = await AttachmentProcessor.preparePutUrl();
    const ax = axios.create();
    AttachmentProcessor.addRetryCountInterceptorToAxios(ax);

    const axConfig = {
      url: putUrl,
      data: body,
      method: 'put',
      timeout: REQUEST_TIMEOUT,
      retry: REQUEST_MAX_RETRY,
      delay: REQUEST_RETRY_DELAY,
      maxContentLength: REQUEST_MAX_CONTENT_LENGTH,
    };

    return ax(axConfig);
  }

  static async preparePutUrl() {
    const signedUrl = await restNodeClient.resources.storage.createSignedUrl();
    return signedUrl.put_url;
  }

  static addRetryCountInterceptorToAxios(ax) {
    ax.interceptors.response.use(undefined, (err) => { //  Retry count interceptor for axios
      const { config } = err;
      if (!config || !config.retry || !config.delay) {
        return Promise.reject(err);
      }
      config.currentRetryCount = config.currentRetryCount || 0;
      if (config.currentRetryCount >= config.retry) {
        return Promise.reject(err);
      }
      config.currentRetryCount += 1;
      return new Promise((resolve) => setTimeout(() => resolve(ax(config)), config.delay));
    });
  }
};
