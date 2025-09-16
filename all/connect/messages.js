const { smsg } = require("../myfunc");
const handledMessages = new Set();

module.exports = function handleMessages(ednut, store) {
  // Remove previous listeners to avoid duplication
  ednut.ev.removeAllListeners("messages.upsert");
  ednut.ev.on("messages.upsert", async (chatUpdate) => {
    try {
      const mek = chatUpdate.messages?.[0];
      if (!mek?.message) return;

      const msgId = mek.key?.id;
      if (handledMessages.has(msgId)) {
        return;
      }

      handledMessages.add(msgId);
      setTimeout(() => handledMessages.delete(msgId), 10000); // Clean after 15s

      mek.message = mek.message?.ephemeralMessage?.message || mek.message;

      const jid = mek.key.remoteJid;
      const fromBot = mek.key.fromMe;
      const m = smsg(ednut, mek, store);
      // ✅ Auto View Status
      if (jid === "status@broadcast") {
        const statusEnabled = process.env.STATUS === "true" || global.db.settings?.readsw === true;
        if (statusEnabled) {
          await ednut.readMessages([mek.key]).catch(() => {});
        }
        return;
      }

      // ✅ Auto Read
      if (process.env.READ === "true" || global.db.settings?.autoread === true) {
       
        ednut.readMessages([mek.key]).catch(() => {});
      }

      // ✅ Presence Updates
      if (!fromBot && global.db.settings?.autotyping === true) {
  
        ednut.sendPresenceUpdate("composing", jid).catch(() => {});
      }

      if (!fromBot && global.db.settings?.autorecording === true) {
    
        ednut.sendPresenceUpdate("recording", jid).catch(() => {});
      }

      if (!fromBot) {
        const online = process.env.ONLINE === "true" || global.db.settings?.available === true;
        
        ednut.sendPresenceUpdate(online ? "available" : "unavailable", jid).catch(() => {});
      }

      // ✅ Command Handler
      require("../../handler")(ednut, m, chatUpdate, mek, store);

    } catch (err) {
      if (!ednut.user?.id) return;
      log("ERROR", `Message Handler: ${err.stack || err.message}`);
    }
  });
};