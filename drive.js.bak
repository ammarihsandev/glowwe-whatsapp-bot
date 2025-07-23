const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const CREDENTIALS = process.env.GOOGLE_SERVICE_ACCOUNT; // Make sure this path is correct

// The ID of your Google Shared Drive folder
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

// Use GoogleAuth with the Service Account credentials for authentication
const auth = new google.auth.GoogleAuth({
  credentials: CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

async function getDriveClient() {
  return google.drive({ version: 'v3', auth: await auth.getClient() });
}

// =========================================================
// Functions for Downloading Session from Drive
// =========================================================

async function downloadSession(folderId, outputDir) {
  try {
    const driveClient = await getDriveClient();
    
    // Find the session.zip file in the specified folder
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
    
    // Create a write stream to save the file
    const dest = fs.createWriteStream(zipPath);
    
    // Download the file from Drive
    const res = await driveClient.files.get(
      { fileId: fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' }
    );

    await new Promise((resolve, reject) => {
      res.data
        .on('end', () => resolve())
        .on('error', err => {
          console.error('❌ Error downloading file stream:', err);
          reject(err);
        })
        .pipe(dest);
    });

    console.log('✅ session.zip downloaded successfully.');

    // Unzip the downloaded file
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(outputDir, true);
    fs.unlinkSync(zipPath); // Clean up the zip file
    console.log('✅ Session unzipped successfully.');

    return true;
  } catch (error) {
    console.error('❌ Error in downloadSession:', error.message);
    return false;
  }
}

// =========================================================
// Functions for Uploading Session to Drive
// =========================================================

async function uploadSession(folderPath, driveFolderId) {
  try {
    const driveClient = await getDriveClient();
    const zipPath = path.join(__dirname, 'session.zip');
    
    // Create the zip file from the session folder
    const zip = new AdmZip();
    zip.addLocalFolder(folderPath); // Use addLocalFolder for a directory
    zip.writeZip(zipPath);
    
    // Find and delete any old session file
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
      console.log('✅ Old session.zip deleted.');
    }
    
    // Upload the new zip file
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
    
    fs.unlinkSync(zipPath); // Clean up the local zip file
    console.log(`✅ Session uploaded to Google Drive. File ID: ${res.data.id}`);
    
    return res.data.id;
  } catch (error) {
    console.error('❌ Error in uploadSession:', error.message);
    return null;
  }
}

// =========================================================
// Export the functions
// =========================================================

module.exports = { uploadSession, downloadSession };

