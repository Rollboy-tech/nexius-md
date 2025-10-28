import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import P from "pino";

const phoneNumber = "255628606274"; // Your phone number here

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
        const code = await sock.requestPairingCode(phoneNumber);
        console.log("📲 Pairing code yako ni:", code);
        console.log("⚡ Nenda WhatsApp > Linked Devices > Link with phone number, kisha andika hii code.");
    }
}

startBot();