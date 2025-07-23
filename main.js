const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// === 🔒 Log Environment Check ===
console.log("🔐 Folder ID:", process.env.GOOGLE_DRIVE_FOLDER_ID);
console.log("🔑 Service Account Present:", !!process.env.GOOGLE_SERVICE_ACCOUNT);

// === 🛂 Load and Parse Credentials ===
let CREDENTIALS;
try {
  CREDENTIALS = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
} catch (err) {
  console.error("❌ GOOGLE_SERVICE_ACCOUNT is not a valid JSON. Check for escape issues.");
  CREDENTIALS = null;
}

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
if (!CREDENTIALS || !FOLDER_ID) {
  console.error("❌ Missing required environment variables. Please ensure both GOOGLE_SERVICE_ACCOUNT and GOOGLE_DRIVE_FOLDER_ID are set.");
  process.exit(1);
}

// === 🔐 Google Auth Setup ===
const auth = new google.auth.GoogleAuth({
  credentials: CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

async function getDriveClient() {
  return google.drive({ version: 'v3', auth: await auth.getClient() });
}

// === 📥 Download session.zip from Drive ===
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
      console.log('❌ session.zip not found in Google Drive folder.');
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
      res.data.on('end', resolve).on('error', reject).pipe(dest);
    });

    console.log('✅ session.zip downloaded successfully.');

    console.log('📦 Extracting ZIP...');
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(outputDir, true);
    fs.unlinkSync(zipPath);
    console.log('✅ Session extracted successfully to:', outputDir);
    return true;

  } catch (err) {
    console.error('❌ Error in downloadSession:', err.message);
    return false;
  }
}

// === 📤 Upload session folder to Drive as ZIP ===
async function uploadSession(folderPath, driveFolderId) {
  try {
    const driveClient = await getDriveClient();
    const zipPath = path.join(__dirname, 'session.zip');

    console.log('📦 Zipping session folder...');
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
      console.log('🔄 Old session.zip found on Drive. Deleting...');
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

// === 🧪 (Optional) Check Folder Access ===
async function testDriveFolder() {
  try {
    const driveClient = await getDriveClient();
    const res = await driveClient.files.list({
      q: `'${FOLDER_ID}' in parents`,
      pageSize: 1,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    console.log('✅ Google Drive access confirmed. Files in folder:', res.data.files.length);
  } catch (err) {
    console.error('❌ Drive access test failed:', err.message);
  }
}

// Uncomment if needed for debugging:
// testDriveFolder();

module.exports = { uploadSession, downloadSession };
