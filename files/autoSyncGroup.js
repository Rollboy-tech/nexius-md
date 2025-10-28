import fs from "fs";
const groupsFile = "./data/groups.json";
import settings from "./settings.js";
//let groups = fs.existsSync(groupsFile) ? JSON.parse(fs.readFileSync(groupsFile, "utf8")) : {};

export function saveGroups() {
    fs.writeFileSync(groupsFile, JSON.stringify(groups, null, 2));
}

//------Export Groups-------
export let groups = {};

// ---------------- AUTO SYNC GROUPS ----------------

export async function autoSyncGroups(sock) {
    // Load existing groups from settings
    const allGroups = await sock.groupFetchAllParticipating();
    for (const [groupId, group] of Object.entries(allGroups)) {
        const isAdmin = group.participants.find(p => p.phoneNumber === sock.user.id)?.admin !== undefined;
        if (!groups[groupId]) {
            groups[groupId] = {
                subject: group.subject,
                botIsAdmin: isAdmin,
                ...settings.defaultSettings
            };

         } else {
            groups[groupId].botIsAdmin = isAdmin; // update admin status
        };   
        
    }
    saveGroups();
    console.log("✅ Groups synchronized:", Object.keys(groups).length);

    sock.ev.on("groups.upsert", async (newGroups) => {
        for (const group of newGroups) {
            const metaData = await sock.groupMetadata(group.groupId);
            const isAdmin = metaData.participants.find(p => p.id === sock.user.id)?.admin !== undefined;
            groups[group.groupId] = {
                subject: metaData.subject,
                botIsAdmin: isAdmin,
                ...settings.defaultSettings
            };
            console.log(`➕ New group added: ${metaData.subject}`);
        }
        saveGroups();
    });

    sock.ev.on("group-participants.update", async (event) => {
        if (event.participants.includes(sock.user.id) && event.action === "remove") {
            delete groups[event.id];
            saveGroups();
        }
    });

    //Notify auto sync activated
    console.log("Group auto-sync activated successfully")
}