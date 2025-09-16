module.exports = function setupStatusForward(ednut) {
  ednut.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const m = messages[0];
      if (!m?.message || m.key.fromMe) return;

      // Extract text
      const text = (
        m.message.conversation ||
        m.message.extendedTextMessage?.text ||
        ""
      ).toLowerCase().trim();

      // Detect status replies
      const isStatusReply =
        m.key.remoteJid === "status@broadcast" ||
        m.message?.extendedTextMessage?.contextInfo?.remoteJid === "status@broadcast";

      // Trigger words
      const triggerWords = ["send", "share", "snd", "give", "forward"];
      const shouldForward = triggerWords.some(word => text.includes(word));

      if (!isStatusReply || !shouldForward) return;

      // Get quoted status
      const statusMessage = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!statusMessage) return;

      // Forward status
      await ednut.sendMessage(
        m.key.remoteJid,
        {
          forward: {
            key: {
              remoteJid: "status@broadcast",
              id: m.message.extendedTextMessage.contextInfo.stanzaId,
            },
            message: statusMessage,
          },
        },
        { quoted: m }
      );
    } catch (err) {
      console.error("Error forwarding status:", err);
    }
  });
};