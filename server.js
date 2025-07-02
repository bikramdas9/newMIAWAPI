const express = require('express');
const axios = require('axios');
const cors = require('cors');
const XLSX = require('xlsx'); // ⬅️ Add this

const app = express();
const PORT = process.env.PORT || 3001;

//app.use(cors());
app.use(express.json());
//const cors = require('cors');

const allowedOrigins = [
  'https://bikramkuma-250205-795-demo.my.site.com',  // ✅ Your Experience Site origin
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));


// ✅ SSE Proxy Route
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
      const raw = chunk.toString().trim();
      console.log('📥 Salesforce Stream:', chunk.toString());
      if (raw && raw.startsWith('{')) {
        res.write(`data: ${raw}\n\n`);
        console.log('✅ Forwarded to LWC:', raw);
      }
    });

    sseRes.data.on('end', () => {
      res.end();
    });

  } catch (error) {
    console.error('Proxy error:', error.response?.data || error.message);
    res.status(500).send('Error connecting to Salesforce SSE');
  }
});

// ✅ NEW: Convert JSON to Excel
app.get('/convert-to-excel', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send("Missing 'url' parameter");
  }

  try {
    const response = await axios.get(url);
    const jsonData = response.data;

    const worksheet = XLSX.utils.json_to_sheet(jsonData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    res.setHeader('Content-Disposition', 'attachment; filename="converted.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Excel conversion error:', error.message);
    res.status(500).send('Failed to convert JSON to Excel');
  }
});

app.listen(PORT, () => {
  console.log(`Node SSE Proxy running on port ${PORT}`);
});
