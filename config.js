
const chalk = require("chalk")
const fs = require("fs")
require('dotenv').config(); 

//================= { SETTINGS } =================\\
global.prefix = (process.env.PREFIX || ".").trim().split(/\s+/);
// your desired prefix symbol only
global.owner = process.env.OWNER_NUMBER || "2348168678573"; // owner number , for multiple number
global.sudo = process.env.SUDO  || "";
global.ownername = process.env.OWNER_NAME || "Patron TechX"; //set bot owner name here 
global.botname = process.env.BOT_NAME || "MYBOT"
global.author = process.env.AUTHOR  || "Patron TechX";
global.packname = process.env.PACK_NAME  || "© ᴘᴀᴛʀᴏɴ ᴍᴅ ²⁵";
global.session = process.env.SESSION_ID || "PATRON-MD~fd53256a37dc6c219f85a2ac6a8340c6"
global.timezone = process.env.TIME_ZONE || "Africa/Lagos";
global.simbol = process.env.SYMBOL || '🚹';
global.thumb = process.env.THUMB || "https://files.catbox.moe/e71nan.png"
global.footer = process.env.FOOTER || '';
global.warn = process.env.WARN || '4'
global.menutype = process.env.MENU_TYPE || ''
global.scan = 'https://patron-md.vercel.app'


//======= Don't touch =======\\
global.msg = {
    succes: '✅ 𝘀𝘂𝗰𝗰𝗲𝘀𝘀! 𝘆𝗼𝘂𝗿 𝗿𝗲𝗾𝘂𝗲𝘀𝘁 𝘄𝗮𝘀 𝗰𝗼𝗺𝗽𝗹𝗲𝘁𝗲𝗱.',
    owner: '⚠️ 𝗼𝗻𝗹𝘆 𝘁𝗵𝗲 𝗯𝗼𝘁 𝗼𝘄𝗻𝗲𝗿 𝗰𝗮𝗻 𝘂𝘀𝗲 𝘁𝗵𝗶𝘀 𝗳𝗲𝗮𝘁𝘂𝗿𝗲.',
    admin: '⚠️ 𝘁𝗵𝗶𝘀 𝗰𝗼𝗺𝗺𝗮𝗻𝗱 𝗶𝘀 𝗿𝗲𝘀𝘁𝗿𝗶𝗰𝘁𝗲𝗱 𝘁𝗼 𝗴𝗿𝗼𝘂𝗽 𝗮𝗱𝗺𝗶𝗻𝘀 𝗼𝗻𝗹𝘆.',
    BotAdmin: '⚠️ 𝗶 𝗻𝗲𝗲𝗱 𝘁𝗼 𝗯𝗲 𝗮𝗻 𝗮𝗱𝗺𝗶𝗻 𝘁𝗼 𝗽𝗲𝗿𝗳𝗼𝗿𝗺 𝘁𝗵𝗶𝘀 𝗮𝗰𝘁𝗶𝗼𝗻.',
    group: '❌ 𝘁𝗵𝗶𝘀 𝗳𝗲𝗮𝘁𝘂𝗿𝗲 𝗰𝗮𝗻 𝗼𝗻𝗹𝘆 𝗯𝗲 𝘂𝘀𝗲𝗱 𝗶𝗻 𝗴𝗿𝗼𝘂𝗽𝘀.',
    private: '❌ 𝘁𝗵𝗶𝘀 𝗳𝗲𝗮𝘁𝘂𝗿𝗲 𝗰𝗮𝗻 𝗼𝗻𝗹𝘆 𝗯𝗲 𝘂𝘀𝗲𝗱 𝗶𝗻 𝗽𝗿𝗶𝘃𝗮𝘁𝗲 𝗰𝗵𝗮𝘁.',
    bot: '🤖 𝘁𝗵𝗶𝘀 𝗰𝗼𝗺𝗺𝗮𝗻𝗱 𝗶𝘀 𝗳𝗼𝗿 𝗯𝗼𝘁 𝘂𝘀𝗲 𝗼𝗻𝗹𝘆.',
    wait: '⏳ 𝗽𝗿𝗼𝗰𝗲𝘀𝘀𝗶𝗻𝗴 𝘆𝗼𝘂𝗿 𝗿𝗲𝗾𝘂𝗲𝘀𝘁, 𝗽𝗹𝗲𝗮𝘀𝗲 𝘄𝗮𝗶𝘁...',
    ban: '🚫 𝘆𝗼𝘂 𝗮𝗿𝗲 𝗯𝗮𝗻𝗻𝗲𝗱 𝗳𝗿𝗼𝗺 𝘂𝘀𝗶𝗻𝗴 𝗰𝗼𝗺𝗺𝗮𝗻𝗱𝘀. 𝗰𝗼𝗻𝘁𝗮𝗰𝘁 𝘁𝗵𝗲 𝗼𝘄𝗻𝗲𝗿 𝘁𝗼 𝗹𝗶𝗳𝘁 𝘁𝗵𝗲 𝗯𝗮𝗻.',
    baileys: '⚠️ 𝗱𝘂𝗲 𝘁𝗼 𝗮 𝗿𝗲𝗰𝗲𝗻𝘁 𝗕𝗮𝗶𝗹𝗲𝘆𝘀 𝘂𝗽𝗱𝗮𝘁𝗲, 𝘁𝗵𝗶𝘀 𝗰𝗼𝗺𝗺𝗮𝗻𝗱 𝗰𝗮𝗻 𝗼𝗻𝗹𝘆 𝗯𝗲 𝘂𝘀𝗲𝗱 𝗶𝗻 𝗽𝗿𝗶𝘃𝗮𝘁𝗲 𝗰𝗵𝗮𝘁.',
    gcban: '🚫 𝘁𝗵𝗶𝘀 𝗴𝗿𝗼𝘂𝗽 𝗶𝘀 𝗯𝗮𝗻𝗻𝗲𝗱 𝗳𝗿𝗼𝗺 𝘂𝘀𝗶𝗻𝗴 𝗯𝗼𝘁 𝗰𝗼𝗺𝗺𝗮𝗻𝗱𝘀.'
};

//==========================
