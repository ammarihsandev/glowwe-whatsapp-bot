const fs = require('fs');
const { google } = require('googleapis');
const path = require('path');
const AdmZip = require('adm-zip');
const CREDENTIALS = require('./credentials.json');

const auth = new google.auth.GoogleAuth({
  credentials: CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

async function uploadSession(folderPath, driveFolderId) {
  const zip = new AdmZip();
  zip.addLocalFile(folderPath);
  const zipPath = path.join(__dirname, 'session.zip');
  zip.writeZip(zipPath);

  const drive = google.drive({ version: 'v3', auth: await auth.getClient() });

  // Hapus file lama di folder
  const { data } = await drive.files.list({
    q: `'${driveFolderId}' in parents and trashed = false`,
    fields: 'files(id, name)',
    // Add this line for Shared Drives
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  for (const file of data.files) {
    await drive.files.delete({ 
      fileId: file.id,
      // Add this line for Shared Drives
      supportsAllDrives: true,
    });
  }

  // Upload zip baru
  const res = await drive.files.create({
    requestBody: {
      name: 'session.zip',
      parents: [driveFolderId],
    },
    media: {
      mimeType: 'application/zip',
      body: fs.createReadStream(zipPath),
    },
    // Add this line for Shared Drives
    supportsAllDrives: true,
  });

  fs.unlinkSync(zipPath);
  console.log('✅ Session uploaded to Google Drive');
}

async function downloadSession(driveFolderId, targetPath) {
  const drive = google.drive({ version: 'v3', auth: await auth.getClient() });

  const { data } = await drive.files.list({
    q: `'${driveFolderId}' in parents and name='session.zip' and trashed = false`,
    fields: 'files(id, name)',
    // Add this line for Shared Drives
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (!data.files.length) return console.log('❌ No session found in Drive');

  const dest = fs.createWriteStream('./session.zip');
  await drive.files.get(
    { 
      fileId: data.files[0].id, 
      alt: 'media',
      // Add this line for Shared Drives
      supportsAllDrives: true,
    },
    { responseType: 'stream' },
    (err, res) => {
      res.data
        .on('end', () => {
          const zip = new AdmZip('./session.zip');
          zip.extractAllTo(targetPath, true);
          fs.unlinkSync('./session.zip');
          console.log('✅ Session downloaded from Google Drive');
        })
        .pipe(dest);
    }
  );
}

// ... (Your usage example remains the same)

module.exports = { uploadSession, downloadSession };