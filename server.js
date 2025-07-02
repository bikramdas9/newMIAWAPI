const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Allow all OPTIONS preflight requests
app.use(cors());
app.use(express.json());

// Main SSE Proxy Endpoint
app.get('/sse-proxy', async (req, res) => {
  const { accessToken, orgId } = req.query;

  if (!accessToken || !orgId) {
    return res.status(400).send('Missing accessToken or orgId');
  }

  // 🟢 Set required CORS headers manually for SSE
  res.setHeader('Access-Control-Allow-Origin', 'https://bikramkuma-250205-795-demo.my.site.com');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const salesforceUrl = `https://bikramkuma-250205-795-demo.my.salesforce-scrt.com/eventrouter/v1/sse`;

  try {
    const sseRes = await axios({
      method: 'get',
      url: salesforceUrl,
      responseType: 'stream',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Org-Id': orgId,
        Accept: 'text/event-stream'
      }
    });

    console.log('🟢 Connected to Salesforce SSE');

    sseRes.data.on('data', (chunk) => {
      const raw = chunk.toString().trim();
      if (raw && raw.startsWith('{')) {
        res.write(`data: ${raw}\n\n`);
        console.log('📤 Forwarded to LWC:', raw);
      }
    });

    sseRes.data.on('end', () => {
      console.log('🔚 Salesforce SSE ended');
      res.end();
    });

    req.on('close', () => {
      console.log('🔴 Client closed connection');
      sseRes.data.destroy();
    });

  } catch (error) {
    console.error('❌ Proxy error:', error?.message || error);
    res.status(500).send('Error connecting to Salesforce SSE');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 SSE Proxy server running on port ${PORT}`);
});
