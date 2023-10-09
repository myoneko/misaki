const {
    default: makeWaSocket,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const pino = require("pino");
require("dotenv").config();

const { chat, chat_init } = require("./chat.js");
chat_init(process.env.chat_APIs.split("--"));
const { voice, voice_init } = require("./voice.js");
voice_init(process.env.wit_key);
const ownerID = process.env.ownerID;
const ownNum = process.env.ownNum;
const ownID = ownNum + "@s.whatsapp.net";
const auth_loc = process.env.auth_loc;

async function misaki() {
    const { state, saveCreds } = await useMultiFileAuthState(auth_loc);
    const { version, isLatest } = await fetchLatestBaileysVersion();

    const sock = makeWaSocket({
        auth: state,
        logger: pino({ level: "silent" }),
        browser: ["Misaki", "Safari", "1.0.0"],
        printQRInTerminal: true,
        version,
        defaultQueryTimeoutMs: undefined,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const shouldReconnect = new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("[-] connection closed -> [", lastDisconnect.error, "]\nreconnecting: ", shouldReconnect);
            if (shouldReconnect) {
                misaki();
            }
        } else if (connection === "open") {
            console.log("[+] connection opened");
            // sock.sendMessage(ownerID, { text: "Oh hello there" });
        }
    });

    function isGroup(id) {
        if (id.endsWith("@g.us")) return true;
        return false;
    }

    function isOwner(id) {
        if (id == ownerID) return true;
        return false;
    }

    /**
     * @param {number} prc min: 1, max: 10
     * @returns {boolean}
     */
    function propb(prc) {
        let prop = Math.floor(Math.random() * 10) + 1;
        return prc >= prop;
    }

    // Timer to avoid spamming
    var chat_timer_idle = 0;
    setInterval(() => {
        if (chat_timer_idle <= 0) return;
        chat_timer_idle--;
    }, 1000);
    sock.ev.on("messages.upsert", async (m) => {
        if (chat_timer_idle > 0) return;
        var msg_data = m.messages[0];
        if (msg_data.key?.fromMe) return;
        // console.log(msg_data);

        // Private
        if (!isGroup(msg_data.key.remoteJid)) {
            // console.log(msg_data);
            let msg_text = msg_data.message?.extendedTextMessage?.text || msg_data.message?.conversation;
            if (msg_text) {
                await sock.readMessages([msg_data.key]);
                await sock.sendPresenceUpdate("composing", msg_data.key.remoteJid);
                await sock.sendMessage(msg_data.key.remoteJid, {
                    text: await chat(msg_text),
                });
            }
        }

        // Groups
        else if (isGroup(msg_data.key.remoteJid)) {
            let msg_text = msg_data.message?.extendedTextMessage?.text || msg_data.message?.conversation;
            await sock.readMessages([msg_data.key]);
            if (!msg_text) return;

            // Commands
            if (msg_text.startsWith("-") && msg_text.length > 1) {
                let command = msg_text.slice(1, msg_text.length).split(" ");
                if (command.length < 2) return;
                switch (command[0]) {
                    case "say":
                        await sock.sendMessage(msg_data.key.remoteJid, {
                            text: command.slice(1, command.length).join(" "),
                        });
                        break;
                    case "vn":
                        sock.sendPresenceUpdate("recording", msg_data.key.remoteJid);
                        await sock.sendMessage(msg_data.key.remoteJid, {
                            audio: { url: await voice(command.slice(1, command.length).join(" ")) },
                            mimetype: "audio/mp4",
                            ptt: true,
                        });
                        break;
                }
                return;
            }

            // Group Chat
            // Tagged
            else if (msg_data.message?.extendedTextMessage?.contextInfo?.mentionedJid?.includes(ownID)) {
                msg_text = msg_text.replace(ownNum, " Misaki ");
                await sock.sendPresenceUpdate("composing", msg_data.key.remoteJid);
                await sock.sendMessage(msg_data.key.remoteJid, { text: await chat(msg_text) }, { quoted: msg_data });
            }
            // Replied
            else if (msg_data.message?.extendedTextMessage?.contextInfo?.participant == ownID) {
                if (msg_text) {
                    if (propb(2)) {
                        sock.sendPresenceUpdate("recording", msg_data.key.remoteJid);
                        await sock.sendMessage(
                            msg_data.key.remoteJid,
                            {
                                audio: { url: await voice(await chat(msg_text)) },
                                mimetype: "audio/mp4",
                                ptt: true,
                            },
                            { quoted: msg_data }
                        );
                    } else {
                        await sock.sendPresenceUpdate("composing", msg_data.key.remoteJid);
                        await sock.sendMessage(
                            msg_data.key.remoteJid,
                            { text: await chat(msg_text) },
                            { quoted: msg_data }
                        );
                    }
                }
            }
        }
    });

    call_reject_timeout = 0;
    sock.ev.on("call", async (call) => {
        if (call[0].status == "ringing") {
            if (call_reject_timeout === 0) {
                call_reject_timeout = 1;
                setTimeout(() => {
                    call_reject_timeout = 0;
                }, 3000);
                await sock.rejectCall(call[0].id, call[0].from);
                await sock.sendMessage(call[0].from, { text: "Don't call Baka!" });
            }
        }
    });

    return sock;
}

misaki();
