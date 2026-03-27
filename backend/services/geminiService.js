// Gemini AI Market Sentiment Service
// Uses Google Gemini API to analyze market data and return a sentiment summary
const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyCBGxoR4u-7McsyWU8XatYLDXMeAkyLCVE';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

async function getMarketSentiment({ signals, market }) {
  // Prepare a prompt for Gemini
  const prompt = `You are a professional crypto market analyst.\n\nRecent signals: ${JSON.stringify(signals, null, 2)}\n\nMarket movers: ${JSON.stringify(market, null, 2)}\n\nBased on this data, provide a concise (max 2 sentences) summary of the current market sentiment (bullish, bearish, neutral, ranging, etc.) and a confidence score (0-100).\nFormat:\n{\n  \"sentiment\": \"...\",\n  \"confidence\": 0-100,\n  \"summary\": \"...\"\n}`;

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    // Parse Gemini response
    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // Try to extract JSON
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    // Fallback: return as summary
    return { sentiment: 'Unknown', confidence: 0, summary: text };
  } catch (err) {
    return { sentiment: 'Error', confidence: 0, summary: err.message };
  }
}

module.exports = { getMarketSentiment };
