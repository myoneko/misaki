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
chat_init(process.env.chat_API);
const ownerID = process.env.ownerID;
const auth_loc = process.env.auth_loc;

async function misaki() {
    const { state, saveCreds } = await useMultiFileAuthState(auth_loc);
    const { version, isLatest } = await fetchLatestBaileysVersion();

    const sock = makeWaSocket({
        auth: state,
        logger: pino({ level: "warn" }),
        browser: ["Misaki", "Safari", "1.0.0"],
        printQRInTerminal: true,
        version: [2, 2313, 8],
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const shouldReconnect =
                new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(
                "[-] connection closed -> ",
                lastDisconnect.error,
                ", reconnecting ",
                shouldReconnect
            );
            if (shouldReconnect) {
                misaki();
            }
        } else if (connection === "open") {
            console.log("[+] connection opened");
            sock.sendMessage(ownerID, { text: "oh hello there" });
        }
    });

    sock.ev.on("messages.upsert", async (m) => {
        var msg_data = m.messages[0];
        if (msg_data.message?.conversation) {
            console.log(
                "[" + msg_data.key + "] " + msg_data.pushName,
                " -> ",
                msg_data.message.conversation
            );
            await sock.sendMessage(msg_data.key.remoteJid, {
                text: await chat(msg_data.message.conversation),
            });
        }
    });

    return sock;
}

misaki();
