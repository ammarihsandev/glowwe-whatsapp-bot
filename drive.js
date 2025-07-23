const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// Load credentials from environment variable
let CREDENTIALS;
try {
  CREDENTIALS = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
} catch (err) {
  console.error("❌ GOOGLE_SERVICE_ACCOUNT is not a valid JSON.");
  CREDENTIALS = null;
}

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

const auth = new google.auth.GoogleAuth({
  credentials: CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

async function getDriveClient() {
  return google.drive({ version: 'v3', auth: await auth.getClient() });
}

// Download session.zip from Google Drive
async function downloadSession(folderId, outputDir) {
  try {
    const driveClient = await getDriveClient();

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const { data } = await driveClient.files.list({
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

    const res = await driveClient.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' }
    );

    await new Promise((resolve, reject) => {
      res.data
        .on('end', resolve)
        .on('error', reject)
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

// Upload session folder to Google Drive as session.zip
async function uploadSession(folderPath, driveFolderId) {
  try {
    const driveClient = await getDriveClient();
    const zipPath = path.join(__dirname, 'session.zip');

    const zip = new AdmZip();
    zip.addLocalFolder(folderPath);
    zip.writeZip(zipPath);

    const { data } = await driveClient.files.list({
      q: `'${driveFolderId}' in parents and name='session.zip' and trashed=false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (data.files.length > 0) {
      console.log('🔄 Found old session.zip on Drive. Deleting...');
      await driveClient.files.delete({
        fileId: data.files[0].id,
        supportsAllDrives: true,
      });
    }

    const res = await driveClient.files.create({
      resource: {
        name: 'session.zip',
        parents: [driveFolderId],
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
console.log("🔐 Folder ID:", process.env.GOOGLE_DRIVE_FOLDER_ID);

module.exports = { uploadSession, downloadSession };
