// js/api.js

const MessengerAPI = {
   
    BASE_URL: 'api/',

 
    async _request(endpoint, options = {}) {
        const url = `${this.BASE_URL}${endpoint}`;
        
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Accept': 'application/json',
                    ...options.headers
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP Error: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`[API Error] Запрос к ${endpoint} завершился ошибкой:`, error.message);
            throw error;
        }
    },

    // ==========================================
    //   (api/keys.php)
    // ==========================================

 
    async getPublicKey(userId) {
        const data = await this._request(`keys.php?user_id=${encodeURIComponent(userId)}`);
        return data.public_key;
    },

 
    async uploadPublicKey(publicKeyBase64) {
        const data = await this._request('keys.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_key: publicKeyBase64 })
        });
        return data.success;
    },

    // ==========================================
    //   (api/messages.php)
    // ==========================================
 
    async getMessages(peerId, lastId = 0) {
        const params = new URLSearchParams({
            peer_id: peerId,
            last_id: lastId
        });
        const data = await this._request(`messages.php?${params.toString()}`);
        return data.messages || [];
    },

 
    async sendMessage(recipientId, ciphertextBase64) {
        const data = await this._request('messages.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient_id: recipientId,
                ciphertext: ciphertextBase64
            })
        });
        return data.id;
    },

    // ==========================================
    //   (api/contacts.php)
    // ==========================================

 
    async getContacts() {
        const data = await this._request('contacts.php');
        return data.contacts || [];
    }
};
