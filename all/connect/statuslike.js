const { smsg } = require("../myfunc");

module.exports = function setupStatusListener(ednut, store) {
  // Do NOT remove all listeners unless you know no other modules need them
  ednut.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const mek = messages[0];
      if (!mek?.message || mek.key.fromMe) return;

      const m = smsg(ednut, mek, store);

      // ------------------------
      // ✅ Status Broadcast React
      // ------------------------
      if (m.key?.remoteJid === "status@broadcast" && global.db?.settings?.autolike === true) {
        const emojis = [
          "❤️","💛","💚","💙","💜","🖤","💖","💘","💝","💞","💟","💌",
          "🔥","✨","💯","🎉","🥳","🤩","😎","😍","🥰","😘","😇","🤍","🤎",
          "😺","😸","😹","😻","😼","🙀","😿","😾","🎈","🌸","🌼","🌻","🌹","💐",
          "🚀","✈️","🚁","🚂","🚗","🚕","🚙","🚌","🚎","🏎️","🏍️","🛵","🚲","🛴",
          "⚡","💥","💫","🌟","⭐","☀️","🌙","🌈","⚽","🏀","🏈","⚾","🎾","🏐","🏓","🏸",
          "🎯","🎳","🎮","🎰","🎲","🎭","🎨","🎵","🎶","🎼","🎹","🥁","🎷","🎺","🎸"
        ];

        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        const botJid = await ednut.decodeJid(ednut.user.id);
        const statusJids = [m.key.participant, botJid].filter(Boolean);

        await ednut.sendMessage(m.key.remoteJid, {
          react: { text: randomEmoji, key: m.key },
        }, { statusJidList: statusJids });

        return; // stop processing for status messages
      }

      // ------------------------
      // ✅ Non-status messages: forward to your command handler
      // ------------------------
      require("../../handler")(ednut, m, messages[0], store);

    } catch (err) {
      console.error("Error in Status Listener:", err);
    }
  });
};
