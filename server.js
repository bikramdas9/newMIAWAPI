const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/sse-proxy', async (req, res) => {
    const { accessToken, orgId } = req.query;
  console.log('accessToken-->'+accessToken+' OrgId-->'+orgId);

    if (!accessToken || !orgId) {
        return res.status(400).send('Missing accessToken or orgId');
    }

    const salesforceUrl = `https://bikramkuma-250205-795-demo.my.salesforce-scrt.com/eventrouter/v1/sse?authorization=${accessToken}&orgId=${orgId}`;

    try {
        const sseRes = await axios({
            method: 'get',
            url: salesforceUrl,
            responseType: 'stream',
            headers: {
                'Accept': 'text/event-stream'
            }
        });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        sseRes.data.on('data', (chunk) => {
            res.write(chunk.toString());
        });

        sseRes.data.on('end', () => {
            res.end();
        });

    } catch (error) {
        console.error('Proxy error:', error.message);
        res.status(500).send('Error connecting to Salesforce SSE');
    }
});

app.listen(PORT, () => {
    console.log(`Node SSE Proxy running on port ${PORT}`);
});
