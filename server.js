app.get('/sse-proxy', async (req, res) => {
    const { accessToken, orgId } = req.query;

    if (!accessToken || !orgId) {
        return res.status(400).send('Missing accessToken or orgId');
    }

    res.setHeader('Access-Control-Allow-Origin', 'https://bikramkuma-250205-795-demo.my.site.com');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.connection.setTimeout(0);

    try {
        const salesforceUrl = `https://bikramkuma-250205-795-demo.my.salesforce-scrt.com/eventrouter/v1/sse`;

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

        // 🔁 Keep-alive to prevent Heroku idle timeout
        const keepAliveInterval = setInterval(() => {
            res.write(`: keep-alive\n\n`);
        }, 25000);

        sseRes.data.on('data', (chunk) => {
            const raw = chunk.toString().trim();
            if (raw.startsWith('{')) {
                res.write(`data: ${raw}\n\n`);
                console.log('📤 Forwarded to client:', raw);
            }
        });

        sseRes.data.on('end', () => {
            clearInterval(keepAliveInterval);
            console.log('🔚 SSE ended');
            res.end();
        });

        req.on('close', () => {
            clearInterval(keepAliveInterval);
            console.log('🔴 Client closed connection');
            sseRes.data.destroy();
        });

    } catch (err) {
        console.error('❌ SSE Proxy Error:', err.message);
        res.status(500).send('Failed to connect to Salesforce SSE');
    }
});
