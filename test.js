let currentTry = 0;
const FILE_UPLOAD_RETRY = 5;
do {
  try {
    throw new Error('error');
  } catch (e) {
    currentTry++;
    if (currentTry === FILE_UPLOAD_RETRY) throw e;
    console.log(`got error ${e.message}, going to retry upload file`);
  }
} while (currentTry < FILE_UPLOAD_RETRY);
