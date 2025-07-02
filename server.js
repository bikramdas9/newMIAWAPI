// ===== server.js (Heroku SSE Proxy with CORS fix) =====
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = \[
'[https://bikramkuma-250205-795-demo.my.site.com](https://bikramkuma-250205-795-demo.my.site.com)'
];

app.use(cors({
origin: function (origin, callback) {
if (!origin || allowedOrigins.includes(origin)) {
callback(null, true);
} else {
callback(new Error('Not allowed by CORS'));
}
},
methods: \['GET', 'POST'],
credentials: true
}));

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

```
res.setHeader('Transfer-Encoding', 'chunked');
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Connection', 'keep-alive');
res.flushHeaders(); 
console.log('🟢 Connected to SSE Proxy');

sseRes.data.on('data', (chunk) => {
  const raw = chunk.toString().trim();
  if (raw && raw.startsWith('{')) {
    res.write(`data: ${raw}\n\n`);
    console.log('✅ Forwarded to LWC:', raw);
  }
});

sseRes.data.on('end', () => {
  res.end();
});
```

} catch (error) {
console.error('Proxy error:', error.response?.data || error.message);
res.status(500).send('Error connecting to Salesforce SSE');
}
});

app.listen(PORT, () => {
console.log(`Node SSE Proxy running on port ${PORT}`);
});

// ===== LWC JS (miawguestChat.js) updated with CORS-safe SSE URL =====
import { LightningElement, track } from 'lwc';
import generateAccessToken from '@salesforce/apex/GuestChatController.generateAccessToken';
import createConversation from '@salesforce/apex/GuestChatController.createConversation';
import sendMessageToServer from '@salesforce/apex/GuestChatController.sendMessageToServer';
import endConversation from '@salesforce/apex/GuestChatController.endConversation';

export default class MiawguestChat extends LightningElement {
@track messages = \[];
@track inputText = '';
@track isThinking = false;
@track showPrompts = true;
@track suggestedPrompts = \[
'Check product availability',
'Track my order',
'Get shipment details',
'Talk to support'
];
accessToken;
conversationId;
eventSource;

```
connectedCallback() {
    this.startChat();
}

async startChat() {
    try {
        this.accessToken = await generateAccessToken();
        this.conversationId = await createConversation({
            accessToken: this.accessToken,
            email: 'guest@example.com',
            firstName: 'Guest',
            lastName: 'User'
        });
        this.subscribeToSSE();
    } catch (err) {
        console.error('Start chat failed:', err);
    }
}

subscribeToSSE() {
    const token = encodeURIComponent(this.accessToken);
    const orgId = '00DKd00000BfI1X';
    const sseUrl = `https://newmiawapi.herokuapp.com/sse-proxy?accessToken=${token}&orgId=${orgId}`;
    this.eventSource = new EventSource(sseUrl);

    this.eventSource.onmessage = (event) => {
        try {
            const parsed = JSON.parse(event.data);
            const entry = parsed?.conversationEntry;
            const isValid = parsed?.conversationId === this.conversationId &&
                entry?.entryType === 'Message' &&
                ['Chatbot', 'Agent'].includes(entry?.sender?.role);

            if (isValid) {
                const payload = JSON.parse(entry.entryPayload);
                const text = payload?.abstractMessage?.staticContent?.text;
                const isHtml = text?.includes('<') && text?.includes('</');

                const messageId = 'msg-' + Date.now();
                this.messages = [
                    ...this.messages,
                    { id: messageId, text, isUser: false, cssClass: 'agent-msg', isHtml }
                ];

                this.scrollToBottom();

                if (isHtml) {
                    setTimeout(() => {
                        const container = this.template.querySelector(`[data-id="${messageId}"]`);
                        if (container) {
                            container.innerHTML = text;
                        }
                    }, 0);
                }
            }
        } catch (error) {
            console.error('❌ SSE processing error:', error);
        }
    };

    this.eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
    };
}

handleInput(event) {
    this.inputText = event.target.value;
}

checkEnter(event) {
    if (event.key === 'Enter') {
        this.sendMessage();
    }
}

async sendMessage() {
    const text = this.inputText.trim();
    if (!text) return;

    this.messages = [
        ...this.messages,
        { id: Date.now(), text, isUser: true, cssClass: 'user-msg' }
    ];

    this.inputText = '';
    this.isThinking = true;
    this.scrollToBottom();

    try {
        await sendMessageToServer({
            accessToken: this.accessToken,
            conversationId: this.conversationId,
            messageText: text
        });
    } catch (err) {
        console.error('Send failed:', err);
    } finally {
        this.isThinking = false;
    }
}

async endChat() {
    try {
        await endConversation({
            accessToken: this.accessToken,
            conversationId: this.conversationId
        });
        if (this.eventSource) this.eventSource.close();
        this.accessToken = null;
        this.conversationId = null;
        this.messages = [];
    } catch (err) {
        console.error('End chat error:', err);
    }
}

scrollToBottom() {
    setTimeout(() => {
        const body = this.template.querySelector('.chat-body');
        if (body) {
            body.scrollTop = body.scrollHeight;
        }
    }, 50);
}

get promptToggleText() {
    return this.showPrompts ? 'Hide Suggestions' : 'View Default Prompts';
}

togglePrompts() {
    this.showPrompts = !this.showPrompts;
}

handlePromptClick(event) {
    this.inputText = event.target.textContent;
}
```

}
