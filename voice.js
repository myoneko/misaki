const axios = require("axios");
const fs = require("fs");

const url = "https://api.wit.ai/synthesize?v=20230215";
const headers = {
    Authorization: "Bearer tocken_api",
    "Content-Type": "application/json",
    Accept: "audio/mpeg",
};

function voice_init(key) {
    headers.Authorization = "Bearer " + key;
}

var voiceNotes = [];

async function voice(text) {
    if (text == "hmm...") return "./voice/static/no-reply.mp3";
    if (voiceNotes.length > 3) {
        fs.unlink(voiceNotes[0], (err) => {
            if (err) {
                console.log("[voice] clear -> error ");
                // console.log(err);
            }
        });
    }
    return new Promise(async (resolve, reject) => {
        var timeStamp = new Date().toLocaleString();
        var outputFile = "./voice/" + timeStamp.slice(0, timeStamp.length - 3).replace(/,\s|\D/g, "_") + ".mp3";
        await axios
            .post(url, { q: text, voice: "Rubie", style: "soft" }, { headers, responseType: "stream" })
            .then((response) => {
                response.data.pipe(fs.createWriteStream(outputFile)).on("finish", () => {
                    // console.log("[voice] synthesize -> success " + outputFile);
                    voiceNotes.push(outputFile);
                    resolve(outputFile);
                });
            });
    }).catch((error) => {
        console.error("[voice] synthesize -> error");
        reject(error);
    });
}

module.exports = { voice_init, voice };

// Test
// require("dotenv").config();
// async function voice_test(text) {
//     voice_init(process.env.wit_key);
//     console.log(await voice(text));
// }

// voice_test("I took a serious brain damage.. so... I don't think I can reply you right now, I'm sorry");
