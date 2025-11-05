import fs from 'fs';
const services = JSON.parse(fs.readFileSync('./data/services.json', 'utf-8'));
export default function startInboxHandler(sock) {

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

            async function sendReply(jid, message, text) {
                try {
                    await new Promise((resolve) => setTimeout(resolve, 3000));
                    await sock.readMessages([msg.key]);
                    await new Promise((resolve) => setTimeout(resolve, text.length * 2));
                    await sock.sendPresenceUpdate("composing", jid); 
                    await new Promise((resolve) => setTimeout(resolve, message.length));
                    await sock.sendMessage(jid, { text: message });
                    await sock.sendPresenceUpdate("paused", jid);
                } catch (e) {
                    console.error("Error: ", e)
                }
            }
            
            if (text) {
                const response = "Habari yako 👋! \nNakukalibisha Rollboy Services!\n> Mimi ni *WhatsApp* chatbot sina uwezo wa kuelewa lugha ya binadamu moja kwa moja kwasasa, Ninachoweza kufanya ninachoweza ni kudhibiti tu makundi ya WhatsApp!\nTafadhari wasiliana na muhudumu wetu moja kwa moja kwa namba 📲 +255 787 885 020 \n\nUnaweza kuwasiliana nae kwa WhatsApp sms au hata call \n\n> Rollboy Technologies ♻";
                sendReply(from, response, text);
                return;
            }
        } catch (e) {
            console.error("Error during prossesing private message: ", e)
        }
    });
}
