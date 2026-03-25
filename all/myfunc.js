// myfunc.js (updated)
// Requires: @whiskeysockets/baileys, chalk, axios, human-readable, node-os-utils

const { proto, generateWAMessage, getContentType, areJidsSameUser } = require('@whiskeysockets/baileys');
const chalk = require("chalk");
const axios = require("axios");
const { sizeFormatter } = require("human-readable");

// ---------- Colors ----------
exports.color = (text, color) => (!color ? chalk.green(text) : chalk.keyword(color)(text));

// ---------- Group helpers ----------
exports.getGroupAdmins = (participants = []) => {
  const admins = [];
  for (const p of participants) {
    if (p?.admin === "superadmin" || p?.admin === "admin") {
      admins.push(p.jid || p.id); // prefer jid, fallback to id
    }
  }
  return admins;
};

// ---------- Size helpers ----------
exports.h2k = (number) => {
  const SI_POSTFIXES = ["", " Ribu", " Juta", " Miliar", " Triliun", " P", " E"];
  if (!Number.isFinite(number)) return number;
  const tier = (Math.log10(Math.abs(number)) / 3) | 0;
  if (tier === 0) return number;
  const postfix = SI_POSTFIXES[tier] || "";
  const scale = Math.pow(10, tier * 3);
  let formatted = (number / scale).toFixed(1);
  if (/\.0$/.test(formatted)) formatted = formatted.slice(0, -2);
  return formatted + postfix;
};

exports.FileSize = (number) => {
  const SI_POSTFIXES = ["B", " KB", " MB", " GB", " TB", " PB", " EB"];
  if (!Number.isFinite(number)) return number;
  const tier = (Math.log10(Math.abs(number)) / 3) | 0;
  if (tier === 0) return number;
  const postfix = SI_POSTFIXES[tier] || "";
  const scale = Math.pow(10, tier * 3);
  let formatted = (number / scale).toFixed(1);
  if (/\.0$/.test(formatted)) formatted = formatted.slice(0, -2);
  return formatted + postfix;
};

exports.bytesToSize = (bytes, decimals = 2) => {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 Bytes";
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

exports.formatSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 Bytes";
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 Bytes";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
};

// ---------- Network / bandwidth ----------
exports.checkBandwidth = async () => {
  let ind = 0;
  let out = 0;
  const stats = await require("node-os-utils").netstat.stats();
  for (const i of stats) {
    ind += parseInt(i.inputBytes || 0);
    out += parseInt(i.outputBytes || 0);
  }
  return {
    download: exports.bytesToSize(ind),
    upload: exports.bytesToSize(out),
  };
};

// ---------- HTTP helpers ----------
exports.fetchJson = async (url, options) => {
  try {
    const res = await axios({
      method: "GET",
      url,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36",
      },
      ...(options || {}),
    });
    return res.data;
  } catch (err) {
    return err;
  }
};

exports.getBuffer = async (url, options) => {
  try {
    const res = await axios({
      method: "GET",
      url,
      headers: { DNT: 1, "Upgrade-Insecure-Request": 1 },
      ...(options || {}),
      responseType: "arraybuffer",
    });
    return res.data;
  } catch (err) {
    return err;
  }
};

exports.nganuin = exports.fetchJson; // alias

// ---------- Misc small utils ----------
exports.getRandom = (ext = "") => `${Math.floor(Math.random() * 10000)}${ext}`;
exports.pickRandom = (arr = []) => arr[Math.floor(Math.random() * arr.length)];

exports.isUrl = (url = "") =>
  typeof url === "string" &&
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi.test(
    url
  );

exports.jsonformat = (data) => {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};

exports.runtime = function (seconds) {
  seconds = Number(seconds) || 0;
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const dDisplay = d > 0 ? d + (d === 1 ? " day, " : " days, ") : "";
  const hDisplay = h > 0 ? h + (h === 1 ? " hour, " : " hours, ") : "";
  const mDisplay = m > 0 ? m + (m === 1 ? " minute, " : " minutes, ") : "";
  const sDisplay = s > 0 ? s + (s === 1 ? " second" : " seconds") : "";
  return dDisplay + hDisplay + mDisplay + sDisplay || "0 seconds";
};

exports.shorturl = async function shorturl(longUrl) {
  try {
    const response = await axios.post("https://shrtrl.vercel.app/", { url: longUrl });
    return response?.data?.data?.shortUrl || longUrl;
  } catch {
    return longUrl;
  }
};

exports.formatp = sizeFormatter({
  std: "JEDEC",
  decimalPlaces: 2,
  keepTrailingZeroes: false,
  render: (literal, symbol) => `${literal} ${symbol}B`,
});

exports.sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- getSizeMedia ----------
exports.getSizeMedia = (path) =>
  new Promise((resolve, reject) => {
    try {
      if (typeof path === "string" && /^https?:\/\//i.test(path)) {
        axios
          .get(path, { method: "HEAD" })
          .then((res) => {
            const length = parseInt(res.headers["content-length"] || "0");
            if (!isNaN(length)) resolve(exports.bytesToSize(length, 3));
            else reject(new Error("No content-length header"));
          })
          .catch(reject);
      } else if (Buffer.isBuffer(path)) {
        const length = Buffer.byteLength(path);
        resolve(exports.bytesToSize(length, 3));
      } else {
        reject(new Error("Unsupported path type"));
      }
    } catch (e) {
      reject(e);
    }
  });

// ---------- smsg (Optimized Hardened with LID support) ----------

exports.smsg = (ptz = {}, m = null, store = null) => {
  try {
    if (!m || typeof m !== "object") return {};

    const M = proto.WebMessageInfo;

    // 🧩 Unwrap ephemeral / viewOnce safely
    while (m?.message?.ephemeralMessage) {
      m.message = m.message.ephemeralMessage.message || {};
    }
    while (m?.message?.viewOnceMessage) {
      m.message = m.message.viewOnceMessage.message || {};
    }

    // 🧩 Normalize key/jid info
    const key = m.key || {};
    const remote = key.remoteJid || "";
    m.id = key.id || "";
    m.chat = remote;
    m.fromMe = !!key.fromMe;
    m.isBaileys = m.id.startsWith("BAE5") && m.id.length === 16;

    // 🧩 Detect chat type
    m.isGroup = remote.endsWith("@g.us");
    m.isLid = remote.endsWith("@lid");
    m.isUser = remote.endsWith("@s.whatsapp.net") || m.isLid;

    const decode = typeof ptz.decodeJid === "function" ? ptz.decodeJid : (x) => x || "";
    const participant =
      (m.fromMe && ptz?.user?.id) || m.participant || key.participant || m.chat || "";
    m.sender = decode(participant);
    if (m.isGroup) m.participant = decode(key.participant) || "";

    // 🧩 Normalize LID senders (so @lid behaves like normal users)
    if (m.sender.endsWith("@lid")) {
      m.normalizedSender = m.sender.replace("@lid", "@s.whatsapp.net");
    } else {
      m.normalizedSender = m.sender;
    }

    // 🧩 Message type/content
    let mtype = "unknown";
    try {
      if (m.message) mtype = getContentType(m.message) || "unknown";
    } catch {}
    m.mtype = mtype;
    m.msg =
      mtype === "viewOnceMessage"
        ? m.message[mtype]?.message?.[getContentType(m.message[mtype]?.message || {})]
        : m.message[mtype];

    // 🧩 Extract body/text fast
    m.body =
      m.message?.conversation ||
      m.msg?.caption ||
      m.msg?.text ||
      m.message?.extendedTextMessage?.text ||
      (m.mtype === "listResponseMessage" && m.msg?.singleSelectReply?.selectedRowId) ||
      (m.mtype === "buttonsResponseMessage" && m.msg?.selectedButtonId) ||
      m.text ||
      "";

    if (m.msg?.caption) m.caption = m.msg.caption;
    m.mentionedJid = (m.msg?.contextInfo?.mentionedJid || []).filter(Boolean);

    // 🧩 Quoted message handler
    const quotedRaw = m.msg?.contextInfo?.quotedMessage;
    if (quotedRaw && typeof quotedRaw === "object") {
      let type = Object.keys(quotedRaw)[0];
      let q = quotedRaw[type];
      if (type === "productMessage" && q && typeof q === "object") {
        type = Object.keys(q)[0];
        q = q[type];
      }
      if (typeof q === "string") q = { text: q };

      m.quoted = q || {};
      m.quoted.mtype = type || "unknown";
      m.quoted.id = m.msg?.contextInfo?.stanzaId || "";
      m.quoted.chat = m.msg?.contextInfo?.remoteJid || m.chat || "";
      m.quoted.isBaileys = m.quoted.id.startsWith("BAE5") && m.quoted.id.length === 16;
      m.quoted.sender = decode(m.msg?.contextInfo?.participant) || "";
      m.quoted.fromMe = m.quoted.sender === decode(ptz?.user?.id || "");
      m.quoted.text =
        m.quoted.text ||
        m.quoted.caption ||
        m.quoted.conversation ||
        m.quoted.contentText ||
        m.quoted.selectedDisplayText ||
        m.quoted.title ||
        "";
      m.quoted.mentionedJid = (m.msg?.contextInfo?.mentionedJid || []).filter(Boolean);

      m.getQuotedMessage = async () => {
        if (!m.quoted.id || !store) return false;
        const qMsg = await store.loadMessage(m.chat, m.quoted.id, ptz).catch(() => null);
        return qMsg ? exports.smsg(ptz, qMsg, store) : false;
      };

      const vM = (m.quoted.fakeObj = proto.WebMessageInfo.fromObject({
        key: { remoteJid: m.quoted.chat, fromMe: m.quoted.fromMe, id: m.quoted.id },
        message: quotedRaw,
        ...(m.isGroup ? { participant: m.quoted.sender } : {}),
      }));

      m.quoted.delete = () => ptz?.sendMessage && ptz.sendMessage(m.quoted.chat, { delete: vM.key });
      m.quoted.copyNForward = (jid, forceForward = false, options = {}) =>
        ptz?.copyNForward?.(jid, vM, forceForward, options);
      m.quoted.download = () => ptz?.downloadMediaMessage?.(m.quoted);
    }

    // 🧩 Media download shortcut
    if (m.msg?.url && typeof ptz.downloadMediaMessage === "function")
      m.download = () => ptz.downloadMediaMessage(m.msg);

    // 🧩 Normalize final text
    m.text =
      m.body ||
      m.msg?.text ||
      m.msg?.caption ||
      m.message?.conversation ||
      m.message?.extendedTextMessage?.text ||
      "";

    // 🧩 Reply helper
    m.reply = (text, chatId = m.chat, options = {}) => {
      if (!ptz) return;
      if (Buffer.isBuffer(text))
        return ptz.sendMedia?.(chatId, text, "file", "", m, { ...options });
      return ptz.sendText?.(chatId, String(text), m, { ...options });
    };

    // 🧩 Copy helpers
    m.copy = () => exports.smsg(ptz, M.fromObject(M.toObject(m)), store);
    m.copyNForward = (jid = m.chat, forceForward = false, options = {}) =>
      ptz.copyNForward?.(jid, m, forceForward, options);

    // 🧩 Append message helper
    ptz.appenTextMessage = async (text, chatUpdate = {}) => {
      const messages = await generateWAMessage(
        m.chat,
        { text: String(text), mentions: m.mentionedJid },
        { userJid: ptz?.user?.id, quoted: m.quoted?.fakeObj }
      );
      messages.key.fromMe = areJidsSameUser(m.sender, ptz?.user?.id);
      if (m?.key?.id) messages.key.id = m.key.id;
      messages.pushName = m.pushName;
      if (m.isGroup) messages.participant = m.sender;
      const msg = { ...chatUpdate, messages: [proto.WebMessageInfo.fromObject(messages)], type: "append" };
      ptz?.ev?.emit?.("messages.upsert", msg);
    };

    return m;
  } catch (e) {
    console.error("smsg error:", e);
    return {};
  }
};

