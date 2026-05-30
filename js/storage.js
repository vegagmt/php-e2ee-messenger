const KeyStorage = {
    PUB_KEY_KEY:      'e2ee_pub',
    PRIV_KEY_KEY_ENC: 'e2ee_priv_enc',
    STORAGE_KEY_KEY:  'e2ee_storage_key', 

 
    _getOrCreateStorageKey() {
        const existing = localStorage.getItem(this.STORAGE_KEY_KEY);
        if (existing) {
            return sodium.from_base64(existing, sodium.base64_variants.URLSAFE_NO_PADDING);
        }
         
        const newKey = sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES);
        localStorage.setItem(
            this.STORAGE_KEY_KEY,
            sodium.to_base64(newKey, sodium.base64_variants.URLSAFE_NO_PADDING)
        );
        return newKey;
    },

    hasKeys() {
        return !!localStorage.getItem(this.PUB_KEY_KEY) &&
               !!localStorage.getItem(this.PRIV_KEY_KEY_ENC);
    },

    saveKeys(publicKey, privateKey) {
        const storageKey = this._getOrCreateStorageKey();
        const nonce      = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
        const ciphertext = sodium.crypto_secretbox_easy(privateKey, nonce, storageKey);

        localStorage.setItem(this.PUB_KEY_KEY,
            sodium.to_base64(publicKey, sodium.base64_variants.URLSAFE_NO_PADDING));
        localStorage.setItem(this.PRIV_KEY_KEY_ENC, JSON.stringify({
            nonce:      sodium.to_base64(nonce,      sodium.base64_variants.URLSAFE_NO_PADDING),
            ciphertext: sodium.to_base64(ciphertext, sodium.base64_variants.URLSAFE_NO_PADDING)
        }));
    },

    loadKeys() {
        if (!this.hasKeys()) return null;
        try {
            const storageKey = this._getOrCreateStorageKey();
            const pubKey     = sodium.from_base64(
                localStorage.getItem(this.PUB_KEY_KEY),
                sodium.base64_variants.URLSAFE_NO_PADDING
            );
            const bundle     = JSON.parse(localStorage.getItem(this.PRIV_KEY_KEY_ENC));
            const nonce      = sodium.from_base64(bundle.nonce,      sodium.base64_variants.URLSAFE_NO_PADDING);
            const ciphertext = sodium.from_base64(bundle.ciphertext, sodium.base64_variants.URLSAFE_NO_PADDING);
            const privKey    = sodium.crypto_secretbox_open_easy(ciphertext, nonce, storageKey);
            return { publicKey: pubKey, privateKey: privKey };
        } catch (e) {
            console.error('Error loading keys:', e);
            return null; 
        }
    },

    clearKeys() {
        [this.PUB_KEY_KEY, this.PRIV_KEY_KEY_ENC, this.STORAGE_KEY_KEY]
            .forEach(k => localStorage.removeItem(k));
    }
};
