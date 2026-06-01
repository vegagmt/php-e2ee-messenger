// js/messenger.js

const MessengerApp = {

    currentPeerId:    null,
    currentPeerPubKey: null,
    lastMessageId:    0,
    pollingInterval:  null,
    myUserId:         null,
    isFetching:       false,

    ui: {},

    async init(currentUserId) {
        this.myUserId = currentUserId;

        this.ui = {
            contactsList:      document.getElementById('contacts-list'),
            chatWindow:        document.getElementById('chat-window'),
            messagesContainer: document.getElementById('chat-messages'),
            messageInput:      document.getElementById('message-input'),
            sendBtn:           document.getElementById('send-btn'),
            chatTitle:         document.getElementById('chat-title'),
        };

        try {
            await E2EECrypto.init();

            this.ui.sendBtn.addEventListener('click', () => this.sendMessage());

            this.ui.messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            await this.loadContacts();

        } catch (err) {
            console.error('[Messenger] Initialization error:', err);
            alert('Failed to start secure chat. Check your console.');
        }
    },

   

    async loadContacts() {
        try {
            const contacts = await MessengerAPI.getContacts();
            this.ui.contactsList.innerHTML = '';

            if (!contacts.length) {
                const empty = document.createElement('div');
                empty.className = 'empty-text';
                empty.textContent = 'There are no active dialogues';
                this.ui.contactsList.appendChild(empty);
                return;
            }

            contacts.forEach(contact => this._renderContactItem(contact));

        } catch (err) {
            console.error('[Messenger] Error loading contacts:', err);
        }
    },

 
    _renderContactItem(contact) {
        const el = document.createElement('div');
        el.className = 'contact-item';
        el.setAttribute('role', 'listitem');
        el.dataset.peerId = contact.contact_id;

         
        const avatar = document.createElement('div');
        avatar.className = 'contact-avatar';
        const { bg, text } = this._avatarColors(contact.contact_id);
        avatar.style.setProperty('--avatar-bg',   bg);
        avatar.style.setProperty('--avatar-text', text);
        avatar.textContent = `#${contact.contact_id}`;
        avatar.setAttribute('aria-hidden', 'true');

   
        const info = document.createElement('div');
        info.className = 'contact-info';

        const name = document.createElement('div');
        name.className = 'contact-name';
        name.textContent = `User #${contact.contact_id}`;

        const preview = document.createElement('div');
        preview.className = 'contact-preview';
        preview.textContent = '🔒 Encrypted';

        info.appendChild(name);
        info.appendChild(preview);

        el.appendChild(avatar);
        el.appendChild(info);

  
        if (contact.unread_count > 0) {
            const badge = document.createElement('span');
            badge.className = 'badge';
            badge.textContent = contact.unread_count;
            badge.setAttribute('aria-label', `${contact.unread_count} unread`);
            el.appendChild(badge);
        }

        el.addEventListener('click', () => this.openChat(contact.contact_id));
        this.ui.contactsList.appendChild(el);
    },

 
    async openChat(peerId) {
        if (this.currentPeerId === peerId) return;

       
        this._stopPolling();

        this.currentPeerId     = peerId;
        this.currentPeerPubKey = null;
        this.lastMessageId     = 0;
        this.ui.messagesContainer.innerHTML = '';
        this.ui.chatTitle.textContent = `User #${peerId}`;

 
        const chatAvatar = document.getElementById('chat-avatar');
        if (chatAvatar) {
            const { bg, text } = this._avatarColors(peerId);
            chatAvatar.style.setProperty('--avatar-bg',   bg);
            chatAvatar.style.setProperty('--avatar-text', text);
            chatAvatar.textContent = `#${peerId}`;
        }

        try {
            this.currentPeerPubKey = await MessengerAPI.getPublicKey(peerId);

            if (!this.currentPeerPubKey) {
                throw new Error('Public key not found');
            }

 
            await this.fetchAndRenderMessages(true);

            this.pollingInterval = setInterval(
                () => this.fetchAndRenderMessages(),
                3000
            );

 
            this.loadContacts();

        } catch (err) {
            console.error('[Messenger] Error opening chat:', err);
            const errDiv = document.createElement('div');
            errDiv.className = 'msg-system';
            errDiv.textContent = 'Failed to load the other party key. They may not be using E2EE chat yet.';
            this.ui.messagesContainer.appendChild(errDiv);
            this.currentPeerId = null;
        }
    },

 
    closeChat() {
        this._stopPolling();
        this.currentPeerId     = null;
        this.currentPeerPubKey = null;
        this.lastMessageId     = 0;
    },

    _stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    },
 
    async fetchAndRenderMessages(forceScroll = false) {
        if (!this.currentPeerId || this.isFetching) return;
        this.isFetching = true;

        try {
            const messages = await MessengerAPI.getMessages(
                this.currentPeerId,
                this.lastMessageId
            );

            if (!messages.length) return;

   
            if (!this.currentPeerPubKey) {
                this.currentPeerPubKey = await MessengerAPI.getPublicKey(this.currentPeerId);
            }

            let hasNew = false;

            for (const msg of messages) {
                if (msg.id <= this.lastMessageId) continue;
                this.lastMessageId = msg.id;
                hasNew = true;

                const isMine = msg.sender_id === this.myUserId;

 
                let plainText;
                let isError = false;

                try {
                    plainText = E2EECrypto.decryptMessage(
                        msg.ciphertext,
                        this.currentPeerPubKey
                    );
                    
                    if (plainText.includes('[The message cannot be decrypted]')) {
                        isError = true;
                    }
                } catch (err) {
                    console.warn(`[Crypto] Decryption error (msg.id: ${msg.id}). The key may have been changed.`);
                    plainText = '[The message cannot be decrypted]';
                    isError = true;
                }

                this._appendMessage(plainText, isMine, msg.created_at, isError);
            }

            if (hasNew) {
                this._scrollToBottom(forceScroll);
            }

        } catch (err) {
            console.error('[Messenger] Error receiving messages:', err);
        } finally {
            this.isFetching = false;
        }
    },
 
    async sendMessage() {
        const text = this.ui.messageInput.value.trim();
        if (!text || !this.currentPeerId) return;

        this.ui.messageInput.disabled = true;
        this.ui.sendBtn.disabled      = true;

        try {
 
            if (!this.currentPeerPubKey) {
                this.currentPeerPubKey = await MessengerAPI.getPublicKey(this.currentPeerId);
            }

            if (!this.currentPeerPubKey) {
                alert('The other party has not yet registered encryption keys.');
                return;
            }

            const ciphertextBase64 = E2EECrypto.encryptMessage(text, this.currentPeerPubKey);
            await MessengerAPI.sendMessage(this.currentPeerId, ciphertextBase64);

            this.ui.messageInput.value  = '';
            this.ui.messageInput.style.height = '';  
            this.ui.sendBtn.disabled    = true;    
            await this.fetchAndRenderMessages(true);
            this.loadContacts();

        } catch (err) {
            console.error('[Messenger] Sending error:', err);
            alert('Failed to send message. Check your connection.');
        } finally {
            this.ui.messageInput.disabled = false;
            this.ui.messageInput.focus();
        }
    },

 
    _appendMessage(text, isMine, timestamp, isError = false) {
        const wrap = document.createElement('div');
        wrap.className = [
            'message',
            isMine   ? 'message-out' : 'message-in',
            isError  ? 'message-error' : '',
        ].filter(Boolean).join(' ');

        const textEl = document.createElement('span');
        textEl.className   = 'message-text';
        textEl.textContent = text;  

        const footer = document.createElement('div');
        footer.className = 'message-footer';

        const timeEl = document.createElement('span');
        timeEl.className   = 'message-time';
        timeEl.textContent = this._formatTime(timestamp);

        const lockEl = document.createElement('span');
        lockEl.className   = 'message-lock';
        lockEl.textContent = '🔒';
        lockEl.setAttribute('aria-label', 'encrypted');

        footer.appendChild(timeEl);
        footer.appendChild(lockEl);

        wrap.appendChild(textEl);
        wrap.appendChild(footer);

        this.ui.messagesContainer.appendChild(wrap);
    },

 
    _scrollToBottom(force = false) {
        const el = this.ui.messagesContainer;
        const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
        if (force || isNearBottom) {
            el.scrollTop = el.scrollHeight;
        }
    },

 
    _formatTime(timestamp) {
        try {
 
            const iso = timestamp.replace(' ', 'T') + (timestamp.includes('Z') ? '' : 'Z');
            return new Date(iso).toLocaleTimeString([], {
                hour:   '2-digit',
                minute: '2-digit',
            });
        } catch {
            return '';
        }
    },

 
    _avatarColors(userId) {
        const palettes = [
            { bg: '#dcf8c6', text: '#0f6e56' },
            { bg: '#e6f1fb', text: '#185fa5' },
            { bg: '#faeeda', text: '#854f0b' },
            { bg: '#fbeaf0', text: '#993556' },
            { bg: '#e1f5ee', text: '#0f6e56' },
            { bg: '#eeedfe', text: '#534ab7' },
        ];
        return palettes[userId % palettes.length];
    },
};
