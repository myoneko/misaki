const axios = require("axios");

var chatAPI = null;

function chat_init(chat_api) {
    chatAPI = chat_api.slice(0, chat_api.length - 15);
}

async function chat(msg) {
    try {
        const response = await axios.get(chatAPI + "test_cat&msg=" + encodeURIComponent(msg));
        return response.data.cnt;
    } catch (error) {
        console.error("Error:", error);
    }
}

module.exports = { chat, chat_init };
