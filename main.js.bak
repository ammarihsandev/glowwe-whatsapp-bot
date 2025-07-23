const path = require('path');
const { uploadSession, downloadSession } = require('./drive');
const { startBot } = require('./bot');

const SESSION_FOLDER = path.join(__dirname, 'session');
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

(async () => {
  console.log('📦 Downloading session from Google Drive...');
  const downloaded = await downloadSession(DRIVE_FOLDER_ID, SESSION_FOLDER);

  if (!downloaded) {
    console.log('⚠️ Starting fresh. No session found.');
  }

  console.log('🚀 Starting WhatsApp bot...');
  await startBot({
    sessionPath: SESSION_FOLDER,
    onClose: async () => {
      console.log('💾 Uploading session to Google Drive...');
      await uploadSession(SESSION_FOLDER, DRIVE_FOLDER_ID);
      console.log('✅ Session upload complete. Exiting...');
      process.exit(0);
    },
  });

  // 👇 Prevent Railway from stopping the container
  setInterval(() => {}, 1000 * 60);
})();
