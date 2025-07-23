const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const pino = require('pino');

async function startBot({ sessionPath, onClose }) {
  const logger = pino({ level: 'silent' });
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const sock = makeWASocket({
    logger,
    printQRInTerminal: true,
    auth: state,
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    console.log(`📩 Message from: ${from} | ${text}`);

    if (text.toLowerCase() === 'ping') {
      await sock.sendMessage(from, { text: 'pong ✅' });
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(`📴 Connection closed. Reconnect? ${shouldReconnect}`);

      if (shouldReconnect) {
        startBot({ sessionPath, onClose }); // reconnect
      } else {
        if (onClose) await onClose(); // upload session then exit
      }
    }

    if (connection === 'open') {
      console.log('✅ Bot is now connected and ready!');
    }
  });
}

module.exports = { startBot };
