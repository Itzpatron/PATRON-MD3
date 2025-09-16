const fs = require("fs");
const { delay } = require("@whiskeysockets/baileys");
const pkg = require("../../package.json");
const getLatestGitHubVersion = require("../getversion");

let onConnectionUpdate;

// JSON persistence for "announced"
const announceFile = "./announce.json";

function loadAnnounce() {
  try {
    if (!fs.existsSync(announceFile)) {
      fs.writeFileSync(announceFile, JSON.stringify({ announced: false }, null, 2));
    }
    return JSON.parse(fs.readFileSync(announceFile));
  } catch {
    return { announced: false };
  }
}

function saveAnnounce(data) {
  try {
    fs.writeFileSync(announceFile, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to save announce.json:", err);
  }
}

module.exports = function handleConnectionUpdate(ednut, startBotz) {
  if (onConnectionUpdate) ednut.ev.off("connection.update", onConnectionUpdate);
  
  onConnectionUpdate = async (update) => {
    const { connection, lastDisconnect } = update;
    let announceCfg = loadAnnounce();
    
    // 💬 Connecting
    if (connection === "connecting") {
      const tries = global.db.reconnect || 0;
      const label = tries === 0 ? "[0] Connecting to WhatsApp..." : `[!] Reconnecting (${tries}/${process.env.MAX_RESTART})...`;
      log(tries === 0 ? "INFO" : "WARN", label);
      if (tries === 0) log("INFO", `[0] Patron Version: v${pkg.version}`);
    }
    
    // ✅ Connected
    if (connection === "open") {
      const userId = ednut.user.id.split(":")[0];
      log("INFO", `[0] Connected to: ${userId}`);
      global.db.reconnect = 0;
      
      // 🔌 Load plugins once
      if (!global.db.loadedPlugins) {
        try {
          log("INFO", "[0] Installing plugins...");
          const files = fs.readdirSync('./plugins/patron').filter(f => f.endsWith('.js'));
          for (const file of files) {
            try {
              require(`../../plugins/patron/${file}`);
            } catch (err) {
              log("ERROR", `[x] Failed to load plugin ${file}: ${err.message}`);
            }
          }
          log("INFO", "[0] Plugins installed.");
          global.db.loadedPlugins = true;
        } catch (err) {
          log("ERROR", `[x] Plugin setup failed: ${err.message}`);
        }
      }
      
      // 📬 Only send connection message ONCE per JSON state
      if (!announceCfg.announced) {
        const latest = await getLatestGitHubVersion();
        const versionNote = latest ?
          latest !== pkg.version ?
          ` (⚠️ New version v${latest} available)` :
          ` (✅ Up to date)` :
          ` (⚠️ Unable to check updates)`;
        
        await ednut.sendMessage(userId + "@s.whatsapp.net", {
          text: `╔═══《 🚀 *𝗣𝗮𝘁𝗿𝗼𝗻-𝗠𝗗 𝗖𝗼𝗻𝗻𝗲𝗰𝘁𝗲𝗱* 🚹 》═══╗  

✨ *𝗛𝗲𝗹𝗹𝗼, 𝗕𝗼𝘀𝘀!*  
*I’m online and ready to serve you ⚡*  

╭─〔 📖 *𝗤𝘂𝗶𝗰𝗸 𝗔𝗰𝗰𝗲𝘀𝘀* 〕  
│ 🔹 *${global.prefix}patron → Bot Info*  
│ 🔹 *${global.prefix}list → All Commands*  
╰───────────────────╯  

╭─〔 📌 *𝗗𝗲𝘁𝗮𝗶𝗹𝘀* 〕  
│ 🔹 *Prefix:* ${global.prefix}  
│ 🔹 *Version:* v${pkg.version}${versionNote}  
│ 🔹 *Telegram:* https://t.me/patrontechhub  
╰───────────────────╯  

⚡ *𝗡𝗼𝘁 𝗥𝗲𝘀𝗽𝗼𝗻𝗱𝗶𝗻𝗴?*  
*1️⃣ Fresh session → ${global.scan}*  
*2️⃣ Update session ID*  
*3️⃣ Restart host 🚀*  

⏳ *𝗚𝗿𝗼𝘂𝗽 𝗡𝗼𝘁𝗶𝗰𝗲:*  
*I may take a few minutes to reply in groups.*  

╚═══《 👑 *𝗣𝗮𝘁𝗿𝗼𝗻 𝗧𝗲𝗰𝗵* 🚹 》═══╝━━━╯`,
        });
        
        announceCfg.announced = true;
        saveAnnounce(announceCfg);
      }
    }
    
    // ❌ Closed or disconnected
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      global.db.reconnect = (global.db.reconnect || 0) + 1;
      
      if (code === 401) {
        log("ERROR", "[x] Logged out: Invalid session (401). Exiting...");
        return;
      }
      
      if (global.db.reconnect >= Number(process.env.MAX_RESTART || 3)) {
        log("ERROR", `[x] Max reconnect attempts reached (${global.db.reconnect}). Restarting...`);
        global.db.reconnect = 0;
        return process.exit(1);
      }
      
      log("WARN", `[!] Disconnected (${code || "unknown"}), retrying... (${global.db.reconnect}/${process.env.MAX_RESTART})`);
      setTimeout(() => startBotz(), 2000);
    }
  };
  
  ednut.ev.on("connection.update", onConnectionUpdate);
};