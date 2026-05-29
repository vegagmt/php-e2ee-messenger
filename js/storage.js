// js/storage.js

const KeyStorage = {
     
    PUB_KEY_KEY: 'e2ee_public_key',
    PRIV_KEY_KEY: 'e2ee_private_key_enc',

 
    _getStorageKey() {
        if (!window.APP_SECRET) {
            throw new Error("Critical error: APP_SECRET is not defined on the page!");
        }
        
        return sodium.crypto_generichash(
            sodium.crypto_secretbox_KEYBYTES, 
            sodium.from_string(window.APP_SECRET)
        );
    },

 
    hasKeys() {
        return !!localStorage.getItem(this.PUB_KEY_KEY) && !!localStorage.getItem(this.PRIV_KEY_KEY);
    },

 
    saveKeys(publicKey, privateKey) {
        const storageKey = this._getStorageKey();

        // 1. Saving the public key in base64url
        const pubKeyStr = sodium.to_base64(publicKey, sodium.base64_variants.URLSAFE_NO_PADDING);
        localStorage.setItem(this.PUB_KEY_KEY, pubKeyStr);

        // 2. Encrypting the private key
        const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
        
        // Encrypting: (privateKey, nonce, storageKey)
        const ciphertext = sodium.crypto_secretbox_easy(privateKey, nonce, storageKey);

        // 3. Packing nonce and ciphertext into JSON for easy storage
        const encryptedBundle = {
            nonce: sodium.to_base64(nonce, sodium.base64_variants.URLSAFE_NO_PADDING),
            ciphertext: sodium.to_base64(ciphertext, sodium.base64_variants.URLSAFE_NO_PADDING)
        };

        localStorage.setItem(this.PRIV_KEY_KEY, JSON.stringify(encryptedBundle));
    },
 
    loadKeys() {
        if (!this.hasKeys()) return null;

        try {
            const pubKeyStr = localStorage.getItem(this.PUB_KEY_KEY);
            const encryptedBundleStr = localStorage.getItem(this.PRIV_KEY_KEY);

            const bundle = JSON.parse(encryptedBundleStr);
            const storageKey = this._getStorageKey();

         
            const publicKey = sodium.from_base64(pubKeyStr, sodium.base64_variants.URLSAFE_NO_PADDING);
            const nonce = sodium.from_base64(bundle.nonce, sodium.base64_variants.URLSAFE_NO_PADDING);
            const ciphertext = sodium.from_base64(bundle.ciphertext, sodium.base64_variants.URLSAFE_NO_PADDING);           
            const privateKey = sodium.crypto_secretbox_open_easy(ciphertext, nonce, storageKey);

            return { publicKey, privateKey };
        } catch (error) {
            console.error("Error reading or decrypting keys. The session may have changed.", error);
           
            this.clearKeys();
            return null;
        }
    },

 
    clearKeys() {
        localStorage.removeItem(this.PUB_KEY_KEY);
        localStorage.removeItem(this.PRIV_KEY_KEY);
    }
};
