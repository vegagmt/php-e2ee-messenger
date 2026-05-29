// js/messenger.js

const MessengerApp = {
     
    currentPeerId: null,
    currentPeerPubKey: null,
    lastMessageId: 0,
    pollingInterval: null,
    myUserId: null,     
    ui: {},

 
    async init(currentUserId) {
        this.myUserId = currentUserId;
        this.ui = {
            contactsList: document.getElementById('contacts-list'),
            chatWindow: document.getElementById('chat-window'),
            messagesContainer: document.getElementById('chat-messages'),
            messageInput: document.getElementById('message-input'),
            sendBtn: document.getElementById('send-btn'),
            chatTitle: document.getElementById('chat-title')
        };

        try {
           
            await E2EECrypto.init();

           
            this.ui.sendBtn.addEventListener('click', () => this.sendMessage());
            this.ui.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            
            await this.loadContacts();

        } catch (error) {
            console.error("Messenger initialization error:", error);
            alert("Failed to start secure chat. Please check your console.");
        }
    },

 
    async loadContacts() {
        const contacts = await MessengerAPI.getContacts();
        this.ui.contactsList.innerHTML = '';

        if (contacts.length === 0) {
            this.ui.contactsList.innerHTML = '<div class="empty-text">There are no active dialogues</div>';
            return;
        }

        contacts.forEach(contact => {
            const el = document.createElement('div');
            el.className = 'contact-item';
            el.innerHTML = `
                <span class="contact-name">User #${contact.contact_id}</span>
                ${contact.unread_count > 0 ? `<span class="badge">${contact.unread_count}</span>` : ''}
            `;
            el.onclick = () => this.openChat(contact.contact_id);
            this.ui.contactsList.appendChild(el);
        });
    },

 
    async openChat(peerId) {
        
        if (this.currentPeerId === peerId) return;

        this.currentPeerId = peerId;
        this.lastMessageId = 0;
        this.ui.messagesContainer.innerHTML = ''; 
        this.ui.chatTitle.innerText = `Чат с User #${peerId}`;
        this.ui.chatWindow.style.display = 'flex';

       
        if (this.pollingInterval) clearInterval(this.pollingInterval);

        try {
          
            this.currentPeerPubKey = await MessengerAPI.getPublicKey(peerId);            
            
            await this.fetchAndRenderMessages();
            
            this.pollingInterval = setInterval(() => this.fetchAndRenderMessages(), 3000);
            
            this.loadContacts();

        } catch (error) {
            console.error("Error opening chat:", error);
            this.ui.messagesContainer.innerHTML = '<div class="error">Failed to load the other partys key. They may not be using E2EE chat yet.</div>';
            this.currentPeerId = null;
        }
    },

  
    async fetchAndRenderMessages() {
        if (!this.currentPeerId || !this.currentPeerPubKey) return;

        const messages = await MessengerAPI.getMessages(this.currentPeerId, this.lastMessageId);
        
        let hasNewMessages = false;

        messages.forEach(msg => {
            
            if (msg.id > this.lastMessageId) {
                this.lastMessageId = msg.id;
                hasNewMessages = true;
            }
 
            const plainText = E2EECrypto.decryptMessage(msg.ciphertext, this.currentPeerPubKey);
            this.appendMessageToUI(plainText, msg.sender_id === this.myUserId, msg.created_at);
        });

 
        if (hasNewMessages) {
            this.scrollToBottom();
        }
    },


    async sendMessage() {
        const text = this.ui.messageInput.value.trim();
        if (!text || !this.currentPeerId || !this.currentPeerPubKey) return;

        this.ui.messageInput.disabled = true;
        this.ui.sendBtn.disabled = true;

        try {
           
            const ciphertextBase64 = E2EECrypto.encryptMessage(text, this.currentPeerPubKey);            
            await MessengerAPI.sendMessage(this.currentPeerId, ciphertextBase64);           
            this.ui.messageInput.value = '';            
            await this.fetchAndRenderMessages();
            await this.loadContacts(); 

        } catch (error) {
            console.error("Sending error:", error);
            alert("Failed to send message.");
        } finally {
            this.ui.messageInput.disabled = false;
            this.ui.sendBtn.disabled = false;
            this.ui.messageInput.focus();
        }
    },

 
    appendMessageToUI(text, isMine, timestamp) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${isMine ? 'message-out' : 'message-in'}`;
        
 
        const textSpan = document.createElement('span');
        textSpan.className = 'message-text';
        textSpan.textContent = text;

        const timeSpan = document.createElement('span');
        timeSpan.className = 'message-time';
        
   
        const date = new Date(timestamp);
        timeSpan.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        msgDiv.appendChild(textSpan);
        msgDiv.appendChild(timeSpan);
        
        this.ui.messagesContainer.appendChild(msgDiv);
    },

    scrollToBottom() {
        this.ui.messagesContainer.scrollTop = this.ui.messagesContainer.scrollHeight;
    }
};
