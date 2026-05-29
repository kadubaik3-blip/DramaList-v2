// ════════════════════════════════════════════
//  DramaList — Backend Proxy Server
//  Menyembunyikan OpenRouter API key dari browser
// ════════════════════════════════════════════
//
//  Cara pakai:
//    1. npm install express dotenv cors node-fetch
//    2. Buat file .env (lihat .env.example)
//    3. node server.js  atau  npm start
//
//  Endpoint:
//    POST /api/ai  — proxy ke OpenRouter
//    GET  /        — serve index.html

require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');

// node-fetch v2 (CommonJS compatible)
const fetch = (...args) =>
  import('node-fetch').then(({ default: f }) => f(...args));

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // taruh index.html di folder /public

// ── Validasi env ──
if (!process.env.OPENROUTER_API_KEY) {
  console.error('[ERROR] OPENROUTER_API_KEY belum di-set di file .env!');
  process.exit(1);
}

// ════════════════════════════════════════════
//  POST /api/ai — Proxy ke OpenRouter
// ════════════════════════════════════════════
app.post('/api/ai', async (req, res) => {
  const { model, messages, temperature, max_tokens } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Field "messages" wajib ada dan berupa array.' });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer':  process.env.SITE_URL || 'https://dramalist.vercel.app',
        'X-Title':       'DramaList'
      },
      body: JSON.stringify({
        model:       model       || 'meta-llama/llama-3.3-8b-instruct:free',
        messages,
        temperature: temperature ?? 0.85,
        max_tokens:  max_tokens  ?? 2048
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[OpenRouter Error]', response.status, data);
      return res.status(response.status).json(data);
    }

    return res.json(data);

  } catch (err) {
    console.error('[Proxy Error]', err.message);
    return res.status(500).json({ error: 'Server proxy error: ' + err.message });
  }
});

// ── Fallback: serve index.html untuk SPA routing ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`DramaList server berjalan di http://localhost:${PORT}`);
});
