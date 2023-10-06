const {
    default: makeWaSocket,
    DisconnectReason,
    useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
require("dotenv").config();

const ownerID = process.env.ownerID;
const auth_loc = process.env.auth_loc;

async function misaki() {
    const { state, saveCreds } = await useMultiFileAuthState(auth_loc);
    const sock = makeWaSocket({
        auth: state,
        printQRInTerminal: true,
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

    return sock;
}

misaki();
