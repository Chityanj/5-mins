 'use strict';

// API Keys from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
    body: JSON.stringify(data),
  };
}

// AI Model Integrations
async function callClaude(message) {
  if (!ANTHROPIC_API_KEY) {
    return 'Claude API key not configured. Please add ANTHROPIC_API_KEY to your Netlify environment variables.';
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: message }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return `Claude API error: ${response.status} - ${error}`;
    }

    const data = await response.json();
    return data.content?.[0]?.text || 'No response from Claude';
  } catch (error) {
    return `Error calling Claude: ${error.message}`;
  }
}

async function callChatGPT(message) {
  if (!OPENAI_API_KEY) {
    return 'OpenAI API key not configured. Please add OPENAI_API_KEY to your Netlify environment variables.';
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: message }],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return `OpenAI API error: ${response.status} - ${error}`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No response from ChatGPT';
  } catch (error) {
    return `Error calling ChatGPT: ${error.message}`;
  }
}

async function callGemini(message) {
  if (!GOOGLE_API_KEY) {
    return 'Google API key not configured. Please add GOOGLE_API_KEY to your Netlify environment variables.';
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }] }],
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return `Gemini API error: ${response.status} - ${error}`;
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini';
  } catch (error) {
    return `Error calling Gemini: ${error.message}`;
  }
}

async function callDeepSeek(message) {
  if (!DEEPSEEK_API_KEY) {
    return 'DeepSeek API key not configured. Please add DEEPSEEK_API_KEY to your Netlify environment variables.';
  }

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: message }],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return `DeepSeek API error: ${response.status} - ${error}`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No response from DeepSeek';
  } catch (error) {
    return `Error calling DeepSeek: ${error.message}`;
  }
}

async function getAIResponse(model, message) {
  switch (model) {
    case 'claude':
      return await callClaude(message);
    case 'gpt':
      return await callChatGPT(message);
    case 'gemini':
      return await callGemini(message);
    case 'deepseek':
      return await callDeepSeek(message);
    default:
      return `Unknown model: ${model}. Supported models: claude, gpt, gemini, deepseek`;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    if (!event.body) {
      return jsonResponse(400, { error: 'Missing body' });
    }

    let payload;
    try {
      payload = JSON.parse(event.body);
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON' });
    }

    const { model, message } = payload;
    if (!model || !message) {
      return jsonResponse(400, { error: 'Missing model or message' });
    }

    if (typeof message !== 'string' || message.trim().length === 0) {
      return jsonResponse(400, { error: 'Message must be a non-empty string' });
    }

    if (message.length > 4000) {
      return jsonResponse(400, { error: 'Message too long (max 4000 chars)' });
    }

    const response = await getAIResponse(model, message.trim());
    return jsonResponse(200, { response });

  } catch (error) {
    console.error('Handler error:', error);
    return jsonResponse(500, { 
      error: 'Internal server error', 
      details: String((error && error.message) || error) 
    });
  }
};


