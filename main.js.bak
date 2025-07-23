// Import all necessary modules
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require('@whiskeysockets/baileys');

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
  console.log('🔄 Checking for saved session on Google Drive...');
  const success = await downloadSession(driveFolderId, sessionFolderPath);
  
  if (success) {
    console.log('✅ Session downloaded successfully from Drive.');
  } else {
    console.log('❌ Session.zip not found in Drive or failed to download.');
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolderPath);

  const sock = makeWASocket({
    auth: state,
  });

  sock.ev.on('creds.update', async () => {
    await saveCreds();
    console.log('✅ Credentials updated and saved locally.');
    console.log('🔄 Uploading session to Google Drive...');
    await uploadSession(sessionFolderPath, driveFolderId);
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // 🔗 QR Link Preview
    if (qr) {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qr)}&size=300x300`;
      console.log('📱 Scan this QR Code from your browser:\n' + qrUrl);
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log('❌ Logged out. Session dihapus.');
        if (fs.existsSync(sessionFolderPath)) {
          fs.rmSync(sessionFolderPath, { recursive: true, force: true });
        }
      } else {
        console.log(`🔁 Connection closed. Reason: ${reason}. Trying to reconnect...`);
        process.exit(1); 
      }
    } else if (connection === 'open') {
      console.log('✅ Connected to WhatsApp');
    }
  });

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

startBot();
