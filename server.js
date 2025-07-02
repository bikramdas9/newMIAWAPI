const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

const allowedOrigins = ['https://bikramkuma-250205-795-demo.my.site.com'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
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

    res.setHeader('Access-Control-Allow-Origin', 'https://bikramkuma-250205-795-demo.my.site.com');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    console.log('🟢 Connected to SSE Proxy');
    sseRes.data.on('data', chunk => {
      const raw = chunk.toString().trim();
      if (raw.startsWith('{')) {
        res.write(`data: ${raw}\n\n`);
      }
    });

    sseRes.data.on('end', () => res.end());

  } catch (error) {
    console.error('SSE Proxy Error:', error.message);
    res.status(500).send('SSE proxy error');
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`SSE Proxy running on port ${PORT}`));
