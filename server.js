const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Basic CORS setup
app.use(cors());
app.use(express.json());
app.options('*', cors()); // Preflight

app.get('/sse-proxy', async (req, res) => {
    const { accessToken, orgId } = req.query;

    if (!accessToken || !orgId) {
        return res.status(400).send('Missing accessToken or orgId');
    }

    // Set SSE headers
    res.setHeader('Access-Control-Allow-Origin', 'https://bikramkuma-250205-795-demo.my.site.com');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 🔄 Prevent Heroku timeout by flushing headers immediately
    res.flushHeaders();

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
            if (raw.startsWith('{')) {
                res.write(`data: ${raw}\n\n`);
                console.log('📤 Forwarded:', raw);
            }
        });

        sseRes.data.on('end', () => {
            console.log('🔚 SSE ended from Salesforce');
            res.end();
        });

        req.on('close', () => {
            console.log('🔴 Client disconnected');
            sseRes.data.destroy();
        });

    } catch (err) {
        console.error('❌ SSE Proxy Error:', err.message);
        res.status(500).send('Failed to connect to Salesforce SSE');
    }
});

app.listen(PORT, () => {
    console.log(`🚀 SSE Proxy Server running on port ${PORT}`);
});
