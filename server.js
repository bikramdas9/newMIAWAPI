const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: '*', // Allow all for testing; replace with exact origin for prod
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Org-Id']
}));

app.use(express.json());

app.get('/sse-proxy', async (req, res) => {
  const { accessToken, orgId } = req.query;
  if (!accessToken || !orgId) {
    return res.status(400).send('Missing accessToken or orgId');
  }

  const salesforceUrl = `https://bikramkuma-250205-795-demo.my.salesforce-scrt.com/eventrouter/v1/sse`;

  try {
    const sseRes = await axios({
      method: 'get',
      url: salesforceUrl,
      responseType: 'stream',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Org-Id': orgId,
        'Accept': 'text/event-stream'
      }
    });

    res.setHeader('Access-Control-Allow-Origin', '*'); // 🔥 Required!
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Transfer-Encoding', 'chunked');

    sseRes.data.on('data', (chunk) => {
      const data = chunk.toString().trim();
      if (data && data.startsWith('{')) {
        res.write(`data: ${data}\n\n`);
      }
    });

    sseRes.data.on('end', () => {
      res.end();
    });

  } catch (error) {
    console.error('SSE Proxy error:', error.response?.data || error.message);
    res.status(500).send('SSE Proxy connection failed');
  }
});

app.listen(PORT, () => {
  console.log(`SSE proxy listening on port ${PORT}`);
});
