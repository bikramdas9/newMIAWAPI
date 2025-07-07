// server.js

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS
app.use(cors());
app.use(express.json());
app.options('*', cors()); // preflight

app.get('/sse-proxy', async (req, res) => {
    const { accessToken, orgId } = req.query;

    if (!accessToken || !orgId) {
        return res.status(400).send('Missing accessToken or orgId');
    }

    // Set SSE headers
    res.setHeader('Access-Control-Allow-Origin', 'https://bikramkuma-250205-795-demo.my.site.com');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // send headers immediately
    res.socket.setTimeout(0); // disable socket timeout

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

        // Send keep-alive to prevent Heroku idle timeout
        const keepAlive = setInterval(() => {
            res.write(`: keep-alive\n\n`);
        }, 25000);

        // Forward Salesforce SSE messages to the client
        sseRes.data.on('data', (chunk) => {
            const raw = chunk.toString().trim();
            if (raw.startsWith('{')) {
                res.write(`data: ${raw}\n\n`);
                console.log('📤 Forwarded to client:', raw);
            }
        });

        sseRes.data.on('end', () => {
            clearInterval(keepAlive);
            console.log('🔚 SSE ended');
            res.end();
        });

        req.on('close', () => {
            clearInterval(keepAlive);
            console.log('🔴 Client closed connection');
            sseRes.data.destroy();
        });

    } catch (err) {
        console.error('❌ SSE Proxy Error:', err.message);
        res.status(500).send('Failed to connect to Salesforce SSE');
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 SSE Proxy running on port ${PORT}`);
});
