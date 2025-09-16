function getGroupAdmins(participants) {
  return participants
    .filter(p => p.admin === "admin" || p.admin === "superadmin")
    .map(p => p.jid);
}

module.exports = function setupAntiMention(ednut) {
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  ednut.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const m = messages[0];
      if (!m?.message || m.key.fromMe) return;

      // Always normalize chatId
      const chatId = m.key.remoteJid || m.chat || "";
      const isGroup = chatId.endsWith("@g.us");
      const sender = isGroup ? (m.key.participant || m.participant) : m.key.remoteJid;

      // ---------- Owner / Admin / Sudo Setup ----------
      const botNumber = await ednut.decodeJid(ednut.user.id);
      const official = ['2348133729715@s.whatsapp.net', '2348025532222@s.whatsapp.net'];
      const setsudo = Array.isArray(global.db.setsudo) ? global.db.setsudo : [];
      const isOwner = [
        botNumber,
        global.owner,
        ...setsudo,
        global.sudo,
        ...official
      ].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(sender);

      let groupMetadata = null;
      let participants = [];
      let groupAdmins = [];
      if (isGroup) {
        groupMetadata = await ednut.groupMetadata(chatId).catch(() => null);
        participants = groupMetadata?.participants || [];
        groupAdmins = participants ? getGroupAdmins(participants) : [];
      }

      const isBotAdmins = groupAdmins.includes(botNumber);
      const isAdmins = groupAdmins.includes(sender);

      // ---------- Anti-Mention Logic ----------
      const groupData = global.db.groups?.[chatId];
      if (!groupData) return;

      const type = Object.keys(m.message)[0];

      if (!["messageContextInfo", "groupStatusMentionMessage"].includes(type)) return;

      // Extract mentions (debug only, but we don’t care if empty)
      const contextInfo = m.message[type]?.contextInfo || {};
      const groupMentions = contextInfo.groupMentions || [];
      const mentionedJid = contextInfo.mentionedJid || [];

      // 🔥 Always trigger action, even if no mentions were detected
      if (isOwner || isAdmins || m.key.fromMe) return;
      if (isGroup && !isBotAdmins) return;

      // -------- Kick Mode --------
      if (groupData.antimention) {
        await ednut.sendMessage(chatId, {
          delete: { remoteJid: chatId, fromMe: false, id: m.key.id, participant: m.key.participant }
        });

        await ednut.sendMessage(chatId, {
          text: `🚷 Mention detected @${sender.split("@")[0]} — you will be *kicked out*.`,
          mentions: [sender]
        }, { quoted: m });

        await sleep(3000);
        await ednut.groupParticipantsUpdate(chatId, [sender], "remove");
        return;
      }

      // -------- Delete Only Mode --------
      if (groupData.antimention2) {
        await ednut.sendMessage(chatId, {
          delete: { remoteJid: chatId, fromMe: false, id: m.key.id, participant: m.key.participant }
        });

        await ednut.sendMessage(chatId, {
          text: `🚫 Mention detected @${sender.split("@")[0]} — mentions are not allowed here.`,
          mentions: [sender]
        }, { quoted: m });
        return;
      }

      // -------- Warn + Kick Mode --------
      if (groupData.antimention3) {
        const warns = global.db.warn || {};
        const warnLimit = global.warn || 3;

        await ednut.sendMessage(chatId, {
          delete: { remoteJid: chatId, fromMe: false, id: m.key.id, participant: m.key.participant }
        });

        warns[sender] = (warns[sender] || 0) + 1;

        if (warns[sender] < warnLimit) {
          global.db.warn = warns;
          await ednut.sendMessage(chatId, {
            text: `⚠️ *ANTIMENTION WARNING*\n▢ *User:* @${sender.split("@")[0]}\n▢ *Warning:* ${warns[sender]}/${warnLimit}\n▢ *Reason:* Sending mentions`,
            mentions: [sender]
          });
        } else {
          try {
            await ednut.groupParticipantsUpdate(chatId, [sender], "remove");
            await ednut.sendMessage(chatId, {
              text: `@${sender.split("@")[0]} was removed from the group after *${warnLimit}* warnings for mentions.`,
              mentions: [sender]
            });
            delete warns[sender];
            global.db.warn = warns;
          } catch (err) {
            console.log("ERROR: Kick failed:", err?.message || err);
          }
        }
        return;
      }

    } catch (err) {
      console.error("Anti-mention listener error:", err);
    }
  });
};
