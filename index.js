import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import P from "pino";
import readline from "readline";
import startGroupHandler from "./files/groups.js";
import startInboxHandler from "./files/inbox.js"; // ⚡ import handler
import { autoSyncGroups } from "./files/autoSyncGroup.js";
import { autoSyncNewslater } from "./files/autoSyncChannel.js";
import http from 'http';
import 'dotenv/config';

// Server to help pingig a bot
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Rollboy Bot is running\n');
    const time = new Date().toISOString();
    console.log('Ping at: ', time);
}).listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
});

// Readline interface for user input

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// ⚡ handler flag, ensure it runs once (move here)
let handlerStarted = false;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: P({ level: "silent" })
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection } = update;
        if(connection === "open") {
            console.log("✅ Bot connected successfully!");
            rl.close();

            if(!handlerStarted) {
                startInboxHandler(sock); // ⚡ start inbox handler once
                startGroupHandler(sock); // ⚡ start group handler once
                autoSyncGroups(sock); // Sync groups automatcally
                autoSyncNewslater(sock); //Sync channels automatically
                handlerStarted = true;
            }
        }
        if(connection === "close") {
            console.log("⚠️ Connection closed. Reconecting...");
            handlerStarted = false;
            startBot(); // auto reconnect
        }
    });

    if(!state.creds.registered) {
        const phoneNumber = await askQuestion("👉 Andika namba yako ya WhatsApp (mfano: 2557XXXXXXX): ");
        const code = await sock.requestPairingCode(phoneNumber);
        console.log("📲 Pairing code yako ni:", code);
        console.log("⚡ Nenda WhatsApp > Linked Devices > Link with phone number, kisha andika hii code.");
    }
}

startBot();