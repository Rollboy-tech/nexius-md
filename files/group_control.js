// Add member helper function
export async function addMember(sock, groupId, memberId, senderAdmin, botIsAdmin, groupMeta) {
    try {
        const groupSettings = groupMeta?.restrict; //This will return true / false
        // true  => only admins can add
        // false => everyone can add

        if (botIsAdmin) {
            // ✅ Bot is admin → add directly
            await sock.groupParticipantsUpdate(groupId, [memberId], "add");
            return 1; //This code meadn seccess when bot is admin can add in any sucumstance
        } else {
            // Bot not admin
            if (groupSettings === false) {
                // If bot is not an admin but any one can add even not admin
                await sock.groupParticipantsUpdate(groupId, [memberId], "add");
                return 2; //So also this code will mean successed
            } else {
                // Group restricted to admin only
                if (senderAdmin) {
                    return 3; //When group ristricte and bot i not admin this code will mean bot can`t add aven user is admin
                } else {
                    return 4; //Thi mean even bot or user those are not admin and group ristrictrd so is imposible to add
                }
            }
        }
    } catch (err) {
        console.error("Error adding member:", err);
        return 5;
    }
}

export async function removeMember(sock, groupId, memberId, senderAdmin, botIsAdmin, msg) {
    if (!botIsAdmin) {
        try {
            await sock.sendMessage(groupId, { text: "❌Can't handle the requsted action because bot is not an admin.\n🤖Make bot admin to handle this thanks🙂🙂."} )
        } catch (e) {
            console.log("Error when sending a massage: ", e)
        }
    }
    try {
            await sock.groupParticipantsUpdate(groupId, [memberId], "remove");
            return `🐯 *I Removed member 👤*\n> As order from: ${senderAdmin ? "Admin" : "member"} *${msg.pushName}*`;

        } catch (err) {
        console.error("Error removing member:", err);
        return "⚠️ Kuna error wakati wa kuondoa member.";
    }
}



export async function deleteMessage(sock, groupId, msg, botIsAdmin) {
    if (!botIsAdmin) {
        await sock.sendMessage(groupId, { text: "❌Can't handle the requsted action because bot is not an admin.\n🤖Make bot admin to handle this thanks🙂🙂."} )
    }

    if (msg.message?.extendedTextMessage?.contextInfo?.stanzaId) {
        const stanzaId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
        const participant = msg.message?.extendedTextMessage?.contextInfo.participant;
        const remoteJid = msg.key.remoteJid;

        try {
            await sock.sendMessage(remoteJid, {
                delete: {
                    remoteJid: remoteJid,
                    id: stanzaId,
                    participant: participant
                }
            });
        } catch (e) {
            console.error("Deley filed", e);
        }
    } else {
        await sock.sendMessage(groupId, {text: "⚠ Please reply to massage you want to delete."});
    }
}

export async function setOnlyAdmins(sock, groupId, value, botIsAdmin) {
    if (!botIsAdmin) {
        await sock.sendMessage(groupId, { text: "❌Can't handle the requsted action because bot is not an admin.\n🤖Make bot admin to handle this thanks🙂🙂."} )
    }

    try {
        // value = true -> only admins can send
        await sock.groupSettingUpdate(groupId, value ? "announcement" : "not_announcement");
        await sock.sendMessage(groupId, { text: `✅ Group mode updated: ${value ? "Only admins can send messages" : "Everyone can send messages"}` });
    } catch (err) {
        console.log("Error setting group mode:", err);
    }
}

export async function giveWarning(sock, groupId, sender, type, reason, botIsAdmin, msg, groupSettings) {
    console.log("Warn called...")
    if (!botIsAdmin)
    
    if (!groupSettings.features.warnings) groupSettings.features.warnings = {};
    console.log("group_control GroupId", groupId); 
    if (!groupSettings.features.warnings[groupId]) groupSettings.features.warnings[groupId] = {};
    if (!groupSettings.features.warnings[groupId][sender]) groupSettings.features.warnings[groupId][sender] = {};

    if (!groupSettings.features.warnings[groupId][sender][type]) groupSettings.features.warnings[groupId][sender][type] = 0;
    groupSettings.features.warnings[groupId][sender][type] += 1;

    const count = groupSettings.features.warnings[groupId][sender][type];

    
    const texts = ` ⚠ ${type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()} message detected!\n\n *${'👤' + msg.pushName || '📲 +' + sender.split("@")[0]}*  _message_ ⚠\n${reason}\n\n> ⚠ You have done that *${count}* times. If you do this more than *${groupSettings.features.warningLimit}* times  you will be removed from the group\n\n 🙂Thanks for your attenstion.`;

    if (count <= groupSettings.features.warningLimit) {
        if (groupSettings.botReply) {
            await sock.sendMessage(groupId, { text: texts }, { quoted: msg });
        } else {
            await sock.sendMessage(groupId, { 
                text: texts, 
             mentions: [sender]
            });
        }
    }

    if (count > groupSettings.features.warningLimit) {
        const response = `\n╭──────────────────╮\n│       ❌❌ *_${type.toUpperCase()} PENALTY_* ❌❌        │\n╰──────────────────╯\n  ━━━━━━━━━👤━━━━━━━━\n *Panished member*\n  👤Name:  *${msg.pushName}*\n 📲Number:  *+${sender.split("@")[0]}*\n\n  ━━━━━━━━━🔨━━━━━━━━\n 📜 *Penalty description:* \n> This member got ${type} panishment. He/She will be removed❌ from the group. Contact the admin for further insruction! \n\n📢Fallow group's procedures to avoid being removed from the group. `;
        if (groupSettings) {
            await sock.sendMessage(groupId, {text: response }, { quoted: msg })
        } else {
            await sock.sendMessage(groupId, { 
                text: response, 
                mentions: [sender] 
            });
        }
        console.log("Message send to:", )
        // action baada ya limit (kick/remove)
        sock.groupParticipantsUpdate(groupId, [sender], "remove");

        // reset warning ya type hiyo tu
        groupSettings.features.warnings[groupId][sender][type] = 0;
    }
}

// Spam Cache
let messageCache = {};

// { groupId: { sender: { text: timestamp } } }

export function isRepeatedSpam(groupId, sender, text, cacheTime = 3600000) { // 1h default
    if (!messageCache[groupId]) messageCache[groupId] = {};
    if (!messageCache[groupId][sender]) messageCache[groupId][sender] = {};

    const now = Date.now();
    //console.log("Message cache: ", messageCache);

    // usiangalie messages fupi < 70 characters
    //if (text.length < 70) return false;

    // message hii ilishawahi kutumwa na user?
    if (messageCache[groupId][sender][text]) {
        const lastTime = messageCache[groupId][sender][text];
        if (now - lastTime < cacheTime) {
            return true; // spam detected (message repeated too soon)
        }
    }

    // update timestamp ya message
    messageCache[groupId][sender][text] = now;
    return false;
}






//export default function
