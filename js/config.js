// Your Gemini API key configuration
const GEMINI_API_KEY = 'AIzaSyDbQJdIi3oXMozj9_nFqpujtt2fAfPB2Eo'; // Replace with your actual Gemini API key

// API endpoint configuration
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

// Function to call Gemini API
async function callGeminiAPI(systemPrompt, userQuery) {
    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
    };

    let response;
    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
        try {
            response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const result = await response.json();
                return result.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response at this moment.";
            } else {
                throw new Error(`API Error: ${response.status}`);
            }
        } catch (error) {
            console.error(`Attempt failed: ${error.message}`);
            retries--;
            if (retries === 0) {
                return "An error occurred while contacting the AI service. Please try again later.";
            }
            await new Promise(res => setTimeout(res, delay));
            delay *= 2; // Exponential backoff
        }
    }
}
