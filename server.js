const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/sse-proxy', async (req, res) => {
  const { accessToken, orgId } = req.query;
  console.log('accessToken-->' + accessToken?.substring(0, 60) + '...');
  console.log('OrgId-->' + orgId);

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

    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); 
    console.log('🟢 Connected to SSE Proxy');
    sseRes.data.on('data', (chunk) => {
      console.log('📥 Salesforce Stream:', chunk.toString());
      res.write(chunk.toString());
    });

    sseRes.data.on('end', () => {
      res.end();
    });

  } catch (error) {
    console.error('Proxy error:', error.response?.data || error.message);
    res.status(500).send('Error connecting to Salesforce SSE');
  }
});

app.listen(PORT, () => {
    console.log(`Node SSE Proxy running on port ${PORT}`);
});
