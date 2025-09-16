const moment = require("moment-timezone");

const handledGroupEvents = new Set();
const DEFAULT_PP = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

let onGroupParticipantsUpdate;

module.exports = function groupParticipantsUpdate(ednut) {
  // 🔁 Remove only our old listener (not Baileys’)
  if (onGroupParticipantsUpdate) {
    ednut.ev.off("group-participants.update", onGroupParticipantsUpdate);
  }

  onGroupParticipantsUpdate = async (anu) => {
    try {
      const groupId = anu.id;
      const eventKey = `${groupId}-${anu.action}-${anu.participants?.join(",")}`;

      if (handledGroupEvents.has(eventKey)) return;
      handledGroupEvents.add(eventKey);
      setTimeout(() => handledGroupEvents.delete(eventKey), 10000);

      let metadata;
      try {
        metadata = await ednut.groupMetadata(groupId);
      } catch (e) {
        if (e?.message?.includes("forbidden") || e?.output?.statusCode === 428) {
          // skip silently if forbidden or connection not ready
          return;
        }
        console.error("Failed to get group metadata:", e);
        return;
      }

      const groupName = metadata.subject;
      const desc = metadata.desc || "No description.";
      const date = moment().tz("Africa/Lagos").format("DD/MM/YYYY");
      const time = moment().tz("Africa/Lagos").format("HH:mm:ss");
      const count = metadata.participants.length;

      const welcomeEnabled = global.db.groups?.[groupId]?.welcome || process.env.WELCOME === "true";
      const goodbyeEnabled = global.db.groups?.[groupId]?.goodbye || process.env.GOODBYE === "true";

      for (const jid of anu.participants) {
        let pp = DEFAULT_PP;
        try { pp = await ednut.profilePictureUrl(jid, "image"); } catch {}

        const userName = await ednut.getName(jid);
        const userTag = `@${jid.split("@")[0]}`;

        const replaceVars = (template) => template
          .replace(/@user/gi, userTag)
          .replace(/@name/gi, userName)
          .replace(/@group/gi, groupName)
          .replace(/@desc/gi, desc)
          .replace(/@date/gi, date)
          .replace(/@time/gi, time)
          .replace(/@count/gi, count.toString());

        // --- Welcome ---
        if (anu.action === "add" && welcomeEnabled) {
          let tmpl = global.db.groups?.[groupId]?.setwelcome || process.env.WELCOME_MSG ||
            `👋 Hello @user, welcome to *@group*!\n@desc\nJoined: @time on @date`;

          const hasPP = tmpl.includes("@pp");
          tmpl = tmpl.replace(/@pp/gi, "").trim();
          const msg = replaceVars(tmpl);

          await ednut.sendMessage(groupId, hasPP
            ? { image: { url: pp }, caption: msg, mentions: [jid] }
            : { text: msg, mentions: [jid] });
        }

        // --- Goodbye ---
        if (anu.action === "remove" && goodbyeEnabled) {
          let tmpl = global.db.groups?.[groupId]?.setgoodbye || process.env.GOODBYE_MSG ||
            `👋 @user left *@group*`;

          const hasPP = tmpl.includes("@pp");
          tmpl = tmpl.replace(/@pp/gi, "").trim();
          const msg = replaceVars(tmpl);

          await ednut.sendMessage(groupId, hasPP
            ? { image: { url: pp }, caption: msg, mentions: [jid] }
            : { text: msg, mentions: [jid] });
        }

        // --- Promote / Demote Events ---
        if (global.db.groups?.[groupId]?.events) {
          const authorName = anu.author ? await ednut.getName(anu.author) : "unknown";
          const authorTag = anu.author ? `@${anu.author.split("@")[0]}` : "unknown";

          if (anu.action === "promote") {
            await ednut.sendMessage(groupId, {
              text: `${userTag} (${userName}) was promoted by ${authorTag} (${authorName})`,
              mentions: [jid, anu.author]
            });
          } else if (anu.action === "demote") {
            await ednut.sendMessage(groupId, {
              text: `${userTag} (${userName}) was demoted by ${authorTag} (${authorName})`,
              mentions: [jid, anu.author]
            });
          }
        }
      }

    } catch (err) {
      console.error("Group update handler error:", err);
    }
  };

  ednut.ev.on("group-participants.update", onGroupParticipantsUpdate);
};