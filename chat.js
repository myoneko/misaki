const axios = require("axios");

var chatAPIs = [];
var error = 0;

/**
 * @param {string} chat_api APIs "--" separated
 */
async function chat_init(chat_apis) {
    await chat_apis.forEach((api) => {
        chatAPIs.push(api.slice(0, api.length - 15));
    });
}

var api_i = 0;
function getAPI() {
    api_i >= chatAPIs.length - 1 ? (api_i = 0) : api_i++;
    // console.log(api_i);
    return chatAPIs[api_i];
}

var noChat_count = 0;
async function chat_retry({ msg, r }) {
    if (r) {
        noChat_count = 0;
        if (error) error = 0;
    } else {
        if (noChat_count > 5) error = 1;
        noChat_count++;
        return await chat(msg);
    }
}

/**
 * @param {string} msg
 * @returns {string} reply ("..." if no eply)
 */
async function chat(msg) {
    if (error) return "hmm...";
    try {
        const response = await axios.get(
            getAPI() +
                "test_cat&msg=" +
                encodeURIComponent(msg) +
                "<set-context>" +
                encodeURIComponent(msg) +
                "Hello</set-context>"
        );
        if (response.data?.cnt) {
            chat_retry({ r: 1 });
            return response.data?.cnt;
        } else {
            var newMsg = await chat_retry({ msg });
            return newMsg;
        }
    } catch (error) {
        console.log("Error:", error);
        var newMsg = await chat_retry({ msg });
        return newMsg;
    }
}

module.exports = { chat, chat_init };

// Test
// require("dotenv").config();
// async function chat_test(m) {
//     chat_init(process.env.chat_API);
//     console.log(await chat(m), chatAPI);
// }

// chat_test("Hello there");
