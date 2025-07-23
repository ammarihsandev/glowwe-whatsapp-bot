const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

// ========== CONFIG ==========
const DRIVE_API_KEY = 'YOUR_GOOGLE_DRIVE_API_KEY';
const FOLDER_ID = 'YOUR_FOLDER_ID_YANG_MENGANDUNG_session.zip';
// ============================

const drive = google.drive({
  version: 'v3',
  auth: DRIVE_API_KEY,
});

async function listFilesInFolder(folderId) {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name)',
  });
  return res.data.files;
}

async function downloadFileFromDrive(fileId, destPath) {
  const dest = fs.createWriteStream(destPath);
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  return new Promise((resolve, reject) => {
    res.data
      .on('end', () => resolve())
      .on('error', err => reject(err))
      .pipe(dest);
  });
}

async function unzipSession(zipPath, outputDir) {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  await fs.createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: outputDir }))
    .promise();
}

async function downloadSessionFromDrive() {
  try {
    const fileList = await listFilesInFolder(FOLDER_ID);
    const sessionFile = fileList.find(file => file.name === 'session.zip');
    if (!sessionFile) {
      console.log('❌ session.zip not found in Drive');
      return false;
    }

    const destPath = path.join(__dirname, 'session.zip');
    await downloadFileFromDrive(sessionFile.id, destPath);
    console.log('✅ session.zip downloaded');

    await unzipSession(destPath, path.join(__dirname, 'auth_info_baileys'));
    console.log('✅ Session unzipped to auth_info_baileys');
    return true;
  } catch (error) {
    console.error('❌ Error downloading session:', error);
    return false;
  }
}

module.exports = { downloadSessionFromDrive };
