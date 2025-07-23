const { default: makeWASocket, useSingleFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const axios = require('axios');

// Config
const SESSION_FILE_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const GDRIVE_ACCESS_TOKEN = process.env.DRIVE_API_KEY;
const sessionFilePath = './auth_info.json';

// Download ZIP session from Google Drive
async function downloadSessionFromDrive() {
    const url = `https://www.googleapis.com/drive/v3/files/${SESSION_FILE_ID}?alt=media`;
    const response = await axios.get(url, {
        headers: {
            Authorization: `Bearer ${GDRIVE_ACCESS_TOKEN}`,
        },
        responseType: 'arraybuffer',
    });

    const zip = new AdmZip(response.data);
    zip.extractAllTo('./', true);
}

// Upload session ZIP to Google Drive
async function uploadSessionToDrive() {
    const zip = new AdmZip();
    zip.addLocalFile(sessionFilePath);
    const buffer = zip.toBuffer();

    await axios.patch(
        `https://www.googleapis.com/upload/drive/v3/files/${SESSION_FILE_ID}?uploadType=media`,
        buffer,
        {
            headers: {
                Authorization: `Bearer ${GDRIVE_ACCESS_TOKEN}`,
                'Content-Type': 'application/zip',
            },
        }
    );
}

// Main bot function
async function startBot() {
    await downloadSessionFromDrive();

    const { state, saveState } = useSingleFileAuthState(sessionFilePath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        auth: state,
        version,
    });

    // Save updated credentials to Drive
    sock.ev.on('creds.update', async () => {
        saveState();
        await uploadSessionToDrive();
    });

    // Connection update
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting...', shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ Bot connected');
        }
    });

    // Incoming messages (optional)
    sock.ev.on('messages.upsert', async (msg) => {
        console.log('📩 Message received:', JSON.stringify(msg, null, 2));
    });
}

startBot();
