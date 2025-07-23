// Import all necessary modules
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason, // DisconnectReason needs to be imported from baileys
} = require('@whiskeysockets/baileys');

// The @hapi/boom dependency is needed to handle connection errors
const Boom = require('@hapi/boom');
const path = require('path');
const fs = require('fs');

// Your custom drive functions
const { uploadSession, downloadSession } = require('./drive');

// This is the folder path where the session will be stored and zipped from
const sessionFolderPath = './auth_info_baileys';

// The ID of your Google Shared Drive folder
const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;


// The main bot function
const startBot = async () => {
  let authInfo;

  // 1. Try to download the session from Drive first
  console.log('🔄 Checking for saved session on Google Drive...');
  const success = await downloadSession(driveFolderId, sessionFolderPath);
  
  if (success) {
    console.log('✅ Session downloaded successfully from Drive.');
  } else {
    console.log('❌ Session.zip not found in Drive or failed to download.');
  }

  // 2. Initialize the authentication state. The path is a folder.
  const { state, saveCreds } = await useMultiFileAuthState(sessionFolderPath);

  const sock = makeWASocket({
    auth: state,
    // The printQRInTerminal option has been removed and is now deprecated.
    // The QR code is now handled in the connection.update event.
  });

  // 3. Attach the saveCreds function to the 'creds.update' event
  // This is the correct way to save credentials as they update.
  sock.ev.on('creds.update', async () => {
    await saveCreds();
    console.log('✅ Credentials updated and saved locally.');
    
    // 4. Also upload the session to Google Drive whenever credentials change
    console.log('🔄 Uploading session to Google Drive...');
    await uploadSession(sessionFolderPath, driveFolderId);
  });

  // 5. Connection state and disconnection handling
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Handle QR code, which now comes in the connection.update event
    if (qr) {
      console.log('Scan this QR code with your WhatsApp:');
      console.log(qr);
      // You can also add code here to send the QR to an API or another user.
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log('❌ Logged out. Session dihapus.');
        // Remove the local session folder on logout
        if (fs.existsSync(sessionFolderPath)) {
          fs.rmSync(sessionFolderPath, { recursive: true, force: true });
        }
      } else {
        console.log(`🔁 Connection closed. Reason: ${reason}. Trying to reconnect...`);
        // The container will be restarted by Railway's policy, so we exit.
        process.exit(1); 
      }
    } else if (connection === 'open') {
      console.log('✅ Connected to WhatsApp');
    }
  });

  // 6. Message handling logic
  sock.ev.on('messages.upsert', async (msg) => {
    const message = msg.messages[0];
    if (!message.message) return;

    const sender = message.key.remoteJid;
    const text = message.message.conversation || message.message.extendedTextMessage?.text;

    console.log('📩 Message from:', sender, '|', text);

    if (text?.toLowerCase() === 'hi') {
      await sock.sendMessage(sender, { text: 'Hello from Railway bot 👋' });
    }
  });
};

// Start the bot
startBot();