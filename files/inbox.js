import fs from 'fs';
const services = JSON.parse(fs.readFileSync('./data/services.json', 'utf-8'));
import settings from './settings.js';

export default function startInboxHandler(sock) {
    // Track active users with their time out.
    let activeUsers = {};

    // Prevent repeeting message
    const processedMessages = new Set();

    sock.ev.on("messages.upsert", async ({ messages }) => {
        try {
            const msg = messages[0];
            if(!msg.message || msg.key.fromMe) return; // Remove processing messege form message from bot
            if(processedMessages.has(msg.key.id)) return;
            processedMessages.add(msg.key.id);
            const from = msg.key.remoteJid;
            if (from.endsWith("@g.us")) return;
            const sent = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
            if(!from || !sent) return;
            const text = sent.toLowerCase().trim();
            let state = '1';

            async function sendReply(jid, message, text) {
                console.log(`Message from ${jid}, Text is ${text}, text length is ${message.length}`)
                try {
                    await new Promise((resolve) => setTimeout(resolve, 3000));
                    await sock.readMessages([msg.key]);
                    await new Promise((resolve) => setTimeout(resolve, text.length * 2));
                    await sock.sendPresenceUpdate("composing", jid); 
                    await new Promise((resolve) => setTimeout(resolve, message.length));
                    await sock.sendMessage(jid, { text: message });
                    await sock.sendPresenceUpdate("paused", jid);
                } catch (e) {

                }
            }
            
            if (text.trim() === "habari") {
                const resw = "";
                const reen = "";
                sendReply(from, response, text);
                return;
            }

            if (text === 'mambo') {
                const response = 'Poah mzima';
                sendReply(from, response, text)
                return;
            }

            if (text) {
                const response = `Sorry`
            }
        } catch (e) {
            console.error("Error during prossesing private message: ", e)
        }
    });
}
