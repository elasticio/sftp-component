import { messages } from 'elasticio-node';
import { isNumberNaN } from '@elastic.io/component-commons-library';
import {
  getTermNumber,
  lookupPluralOperators,
  lookupPluralConditionsMatch,
  normalizeDirectoryName,
  getFileCorrectPath,
  formatFile
} from '../utils/utils';
import Sftp from '../Sftp';
import { lookupObjectsEmitIndividually, lookupObjectsFetchAll } from '../metadata/outputMetadata';

let sftpClient: Sftp;

export async function processAction(msg, cfg) {
  this.logger.info('"Download Files" action started');

  sftpClient ||= new Sftp(this.logger, cfg);
  sftpClient.setLogger(this.logger);

  const { directoryPath } = msg.body;
  const directory = normalizeDirectoryName(directoryPath);
  let {
    fileUploadRetry = 5,
    retryTimeout = 10000,
    fileUploadTimeout = 10000,
  } = cfg;

  const {
    uploadFilesToAttachments,
    emitFileContent,
    emitBehaviour
  } = cfg;

  if (isNumberNaN(fileUploadRetry)) throw new Error(`"${fileUploadRetry}" must be valid number`);
  if (isNumberNaN(fileUploadTimeout)) throw new Error(`"${fileUploadTimeout}" must be valid number`);
  if (isNumberNaN(retryTimeout)) throw new Error(`"${retryTimeout}" must be valid number`);
  fileUploadRetry = Number(fileUploadRetry);
  retryTimeout = Number(retryTimeout);
  fileUploadTimeout = Number(fileUploadTimeout);

  if (!(await sftpClient.exists(directory))) {
    throw new Error(`Directory ${directory} is not exist`);
  }
  const listOfFiles = await sftpClient.list(directory);
  const filteredList = listOfFiles
    .filter((item) => lookupPluralConditionsMatch(msg.body, item, this.logger))
    .filter(((item) => item.type === '-'));
  if (filteredList.length === 0) {
    this.logger.warn('Files that match the criteria not found in the provided directory');
    return messages.newEmptyMessage();
  }

  this.logger.debug(`Total files found: ${filteredList.length}`);

  const results: any[] = [];
  const attachments = {};
  for (const file of filteredList) {
    const fileCorrectPath = getFileCorrectPath(directory, file.name);
    const result = formatFile(file, directory);
    if (emitFileContent) {
      const base64Content = await sftpClient.getFile(fileCorrectPath, result.size, 'base64');
      result.base64Content = base64Content;
    } else if (uploadFilesToAttachments === 'Yes') {
      const attachmentUrl = await sftpClient.getFile(fileCorrectPath, result.size, 'attachment', msg.id);
      result.attachment_url = attachmentUrl;
      attachments[result.name] = { url: attachmentUrl, size: result.size };
    }
    if (emitBehaviour === 'emitIndividually') {
      const emitData = messages.newMessageWithBody(result);
      if (uploadFilesToAttachments === 'Yes') emitData.attachments = { [result.name]: { url: result.attachment_url, size: result.size } };
      await this.emit('data', emitData);
    } else {
      results.push(result);
    }
  }

  if (emitBehaviour === 'fetchAll') {
    await this.emit('data', {
      ...messages.newMessageWithBody({ results }),
      attachments
    });
  }

  this.logger.info('"Download Files" action completed successfully');
  return null;
}

export async function getMetaModel(cfg) {
  const { emitBehavior } = cfg;
  const additionalIn = {
    directoryPath: {
      type: 'string',
      title: 'Directory Path',
      required: true,
    }
  };

  const termProperties = {};
  const termNumber = getTermNumber(cfg);
  if (termNumber > 0) {
    const fieldNameEnum = ['name', 'modifyTime', 'accessTime', 'size'];
    const conditionEnum = [...Object.keys(lookupPluralOperators), 'like'];
    const logicalOperatorEnum = ['and', 'or'];
    for (let i = 0; i < termNumber; i += 1) {
      termProperties[`searchTerm${i}`] = {
        title: `Search term ${i + 1}`,
        type: 'object',
        required: true,
        properties: {
          fieldName: {
            title: 'Field name',
            type: 'string',
            required: true,
            enum: fieldNameEnum,
          },
          condition: {
            title: 'Condition',
            type: 'string',
            required: true,
            enum: conditionEnum,
          },
          fieldValue: {
            title: 'Field value',
            type: 'string',
            required: true,
          },
        },
      };

      if (i !== (termNumber - 1)) {
        termProperties[`criteriaLink${i}`] = {
          title: 'Criteria Link',
          type: 'string',
          required: true,
          enum: logicalOperatorEnum,
        };
      }
    }
  }

  const outMeta = emitBehavior === 'emitIndividually' ? lookupObjectsEmitIndividually : lookupObjectsFetchAll;

  return {
    in: {
      type: 'object',
      properties: {
        ...additionalIn,
        ...termProperties,
      },
    },
    out: outMeta,
  };
}

module.exports.process = processAction;
module.exports.getMetaModel = getMetaModel;
