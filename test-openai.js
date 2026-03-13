require('dotenv').config();
const { OpenAI } = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function testApi() {
    try {
        console.log("Testing OpenAI API...");
        const response = await openai.models.list();
        console.log("SUCCESS! Found models. API Key is valid and IP is unblocked.");
        console.log("First model:", response.data[0].id);
    } catch (error) {
        console.error("OpenAI API Error details:");
        console.error("Status:", error.status);
        console.error("Message:", error.message);
        console.error("Type:", error.type);
        console.error("Code:", error.code);
    }
}

testApi();
