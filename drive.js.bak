const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// Parse the service account credentials from environment variable
const CREDENTIALS = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

// The ID of your Google Shared Drive folder
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

// Authenticate with Google Drive using service account
const auth = new google.auth.GoogleAuth({
  credentials: CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

async function getDriveClient() {
  const client = await auth.getClient();
  return google.drive({ version: 'v3', auth: client });
}

// ================================
// DOWNLOAD SESSION
// ================================
async function downloadSession(folderId, outputDir) {
  try {
    const drive = await getDriveClient();

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const { data } = await drive.files.list({
      q: `'${folderId}' in parents and name='session.zip' and trashed=false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (!data.files.length) {
      console.log('❌ session.zip not found in Drive');
      return false;
    }

    const fileId = data.files[0].id;
    const zipPath = path.join(outputDir, 'session.zip');
    const dest = fs.createWriteStream(zipPath);

    const res = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' }
    );

    await new Promise((resolve, reject) => {
      res.data
        .on('end', resolve)
        .on('error', (err) => {
          console.error('❌ Error downloading file stream:', err);
          reject(err);
        })
        .pipe(dest);
    });

    console.log('✅ session.zip downloaded successfully.');

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(outputDir, true);
    fs.unlinkSync(zipPath);
    console.log('✅ Session unzipped successfully.');

    return true;
  } catch (err) {
    console.error('❌ Error in downloadSession:', err.message);
    return false;
  }
}

// ================================
// UPLOAD SESSION
// ================================
async function uploadSession(folderPath, folderId) {
  try {
    const drive = await getDriveClient();
    const zipPath = path.join(__dirname, 'session.zip');

    const zip = new AdmZip();
    zip.addLocalFolder(folderPath);
    zip.writeZip(zipPath);

    const { data } = await drive.files.list({
      q: `'${folderId}' in parents and name='session.zip' and trashed=false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (data.files.length > 0) {
      console.log('🔄 Found old session.zip on Drive. Deleting...');
      try {
        await drive.files.delete({
          fileId: data.files[0].id,
          supportsAllDrives: true,
        });
        console.log('✅ Old session.zip deleted.');
      } catch (err) {
        if (err.errors?.[0]?.reason === 'notFound') {
          console.warn('⚠️ session.zip already deleted or not found, skipping deletion.');
        } else {
          throw err;
        }
      }
    }

    const res = await drive.files.create({
      resource: {
        name: 'session.zip',
        parents: [folderId],
      },
      media: {
        mimeType: 'application/zip',
        body: fs.createReadStream(zipPath),
      },
      supportsAllDrives: true,
    });

    fs.unlinkSync(zipPath);
    console.log(`✅ Session uploaded to Google Drive. File ID: ${res.data.id}`);

    return res.data.id;
  } catch (err) {
    console.error('❌ Error in uploadSession:', err.message);
    return null;
  }
}

module.exports = {
  uploadSession,
  downloadSession,
};
