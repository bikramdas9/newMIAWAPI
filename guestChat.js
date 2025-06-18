import { LightningElement, track } from 'lwc';
import generateAccessToken from '@salesforce/apex/GuestChatController.generateAccessToken';
import createConversation from '@salesforce/apex/GuestChatController.createConversation';
import sendMessageToServer from '@salesforce/apex/GuestChatController.sendMessageToServer';
import pollMessages from '@salesforce/apex/GuestChatController.pollMessages';
import endConversation from '@salesforce/apex/GuestChatController.endConversation';

export default class GuestChat extends LightningElement {
    @track isChatVisible = false;
    @track inputText = '';
    @track messages = [];
    @track isThinking = false;
    eventSource;
    @track isEmbedded = false;
    //messages = [];

    accessToken;
    conversationId;
    pollingInterval;
    connectedCallback() {
  // Detect if running in an iframe
    this.isEmbedded = window.top !== window.self;
    console.log('Is embedded:', this.isEmbedded);
                }
            get showChatIcon() {
    return this.isEmbedded || !this.isChatVisible;
}

    toggleChatWindow() {
  this.isChatVisible = !this.isChatVisible;
  if (this.isEmbedded) {
    window.parent.postMessage(this.isChatVisible ? 'openChat' : 'closeChat', '*');
  }
  if (this.isChatVisible && !this.accessToken) {
    this.initChatSession();
  }
}


    async initChatSession() {
        try {
            const token = await generateAccessToken();
            this.accessToken = token;

            // Use dummy pre-chat data for demo, replace with real values if needed
            const response = await createConversation({
                accessToken: this.accessToken,
                email: 'guest@example.com',
                firstName: 'Guest',
                lastName: 'User'
            });
            console.log('Conversation created:', response);            
            //const parsed = JSON.parse(response);
            //console.log('Conversation created1:', parsed);  
            this.conversationId = response;
            console.log('Conversation created2::', this.conversationId); 

            this.startPolling();
        } catch (error) {
            console.error('Init error:', error);
        }
    }

    startPolling() {
    const token = encodeURIComponent(this.accessToken);
    console.log('Access Token:', token);
    const orgId = encodeURIComponent('00DKd00000BfI1X'); // Replace with your orgId

    const proxySseUrl = `https://newmiawapi-5729deab8e80.herokuapp.com/sse-proxy?accessToken=${token}&orgId=${orgId}`;
    
    this.eventSource = new EventSource(proxySseUrl);

    this.eventSource.onmessage = (event) => {
  try {
    const parsed = JSON.parse(event.data);
    const payload = parsed?.conversationEntry?.entryPayload;

    if (payload) {
      const contentObj = JSON.parse(payload);
      const text = contentObj?.abstractMessage?.staticContent?.text;

      if (text) {
        this.messages = [
          ...this.messages,
          {
            id: contentObj.id || Date.now(),
            text: text,
            isUser: false,
            cssClass: 'agent-msg'
          }
        ];
        console.log('💬 Message from agent:', text);
      }
    }
  } catch (err) {
    console.error('❌ Error parsing SSE message:', err, event.data);
  }
};

    this.eventSource.onerror = (error) => {
        console.error('SSE Error from Node Proxy:', error);
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

        this.messages.push({
            id: Date.now(),
            text: text,
            isUser: true,
            cssClass: 'user-msg'
                        });

        this.inputText = '';
        this.isThinking = true;

        try {
            await sendMessageToServer({
                accessToken: this.accessToken,
                conversationId: this.conversationId,
                messageText: text
            });
        } catch (error) {
            console.error('Send message error:', error);
        } finally {
            setTimeout(() => {
                this.isThinking = false;
            }, 1000);
        }
    }

    async endChat() {
        clearInterval(this.pollingInterval);
        try {
            await endConversation({
                accessToken: this.accessToken,
                conversationId: this.conversationId
            });
        } catch (error) {
            console.error('End chat error:', error);
        }

        this.messages = [];
        this.accessToken = null;
        this.conversationId = null;
        this.isChatVisible = false;
    }
}
