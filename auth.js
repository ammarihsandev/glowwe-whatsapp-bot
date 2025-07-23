const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { saveSession } = require('./drive-session');
const fs = require('fs');

async function createBot(sessionDataFromDrive) {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');

  // Jika ada sesi dari Google Drive, timpa auth lokal
  if (sessionDataFromDrive) {
    try {
      fs.writeFileSync('./auth/creds.json', JSON.stringify(sessionDataFromDrive));
      console.log('✅ Session restored from Google Drive');
    } catch (err) {
      console.error('❌ Gagal menulis sesi dari Google Drive:', err);
    }
  }

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on('creds.update', async () => {
    await saveCreds();
    const sessionData = JSON.parse(fs.readFileSync('./auth/creds.json', 'utf8'));
    await saveSession(sessionData);
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, qr } = update;
    if (qr) {
      const qrcode = require('qrcode-terminal');
      qrcode.generate(qr, { small: true });
      console.log('📱 Scan QR Code di atas dengan WhatsApp kamu!');
    }

    if (connection === 'close') {
      console.log('❌ Connection closed. Trying to reconnect...');
      createBot(); // coba reconnect
    } else if (connection === 'open') {
      console.log('✅ Connection opened and ready!');
    }
  });


  return sock;
}

module.exports = { createBot };
