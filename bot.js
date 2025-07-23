const { uploadSession } = require('./main'); // make sure path is correct

const SESSION_PATH = './session';
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

sock.ev.on('connection.update', async (update) => {
  const { connection, lastDisconnect } = update;

  if (connection === 'open') {
    console.log('✅ Bot is now connected and ready!');

    // Upload session after successful connection
    try {
      await uploadSession(SESSION_PATH, FOLDER_ID);
      console.log('💾 Session uploaded after login.');
    } catch (err) {
      console.error('❌ Failed to upload session after login:', err.message);
    }
  }

  if (connection === 'close') {
    const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
    console.log('📴 Connection closed. Reconnect?', shouldReconnect);

    // Optional: Upload on disconnect too
    try {
      await uploadSession(SESSION_PATH, FOLDER_ID);
      console.log('💾 Session uploaded on disconnect.');
    } catch (err) {
      console.error('❌ Failed to upload session on disconnect:', err.message);
    }
  }
});
