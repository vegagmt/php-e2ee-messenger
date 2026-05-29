// js/crypto.js

const E2EECrypto = {
 
    myPublicKey: null,
    myPrivateKey: null,

 
    async init() {
        // Wait for WebAssembly- sodium
        await sodium.ready;

        const savedKeys = KeyStorage.loadKeys();

        if (savedKeys) {
            console.log("[Crypto] Keys successfully downloaded from storage");
            this.myPublicKey = savedKeys.publicKey;
            this.myPrivateKey = savedKeys.privateKey;
        } else {
            console.log("[Crypto] No keys found. Generating a new pair X25519...");
            
            // Keys gen
            const keypair = sodium.crypto_box_keypair();
            this.myPublicKey = keypair.publicKey;
            this.myPrivateKey = keypair.privateKey;

            // Save in localStorage
            KeyStorage.saveKeys(this.myPublicKey, this.myPrivateKey);            
            const pubKeyBase64 = sodium.to_base64(this.myPublicKey, sodium.base64_variants.URLSAFE_NO_PADDING);
            
            try {
                await MessengerAPI.uploadPublicKey(pubKeyBase64);
                console.log("[Crypto] The new public key has been successfully uploaded to the server.");
            } catch (e) {
                console.error("[Crypto] Error uploading key to server:", e);
                KeyStorage.clearKeys();
            }
        }
    },

 
    encryptMessage(text, recipientPubKeyBase64) {
        // 1. Preparing the data
        const messageBytes = sodium.from_string(text);
        const recipientPubKey = sodium.from_base64(recipientPubKeyBase64, sodium.base64_variants.URLSAFE_NO_PADDING);
        
        // 2. Generate a unique 24-byte nonce for this message.
        const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
        
        // 3. We encrypt (the output is ciphertext, to which the MAC tag is already attached)
        const ciphertext = sodium.crypto_box_easy(messageBytes, nonce, recipientPubKey, this.myPrivateKey);

        // 4. We merge the nonce and ciphertext into one array (payload)
        const payload = new Uint8Array(nonce.length + ciphertext.length);
        payload.set(nonce, 0);
        payload.set(ciphertext, nonce.length);

        // 5. Convert to base64url for sending to the server
        return sodium.to_base64(payload, sodium.base64_variants.URLSAFE_NO_PADDING);
    },

 
    decryptMessage(payloadBase64, senderPubKeyBase64) {
        try {
            // 1. Decoding base64url
            const payload = sodium.from_base64(payloadBase64, sodium.base64_variants.URLSAFE_NO_PADDING);
            const senderPubKey = sodium.from_base64(senderPubKeyBase64, sodium.base64_variants.URLSAFE_NO_PADDING);

            // 2. We split the payload back into nonce (the first 24 bytes) and ciphertext (the rest)
            const nonce = payload.slice(0, sodium.crypto_box_NONCEBYTES);
            const ciphertext = payload.slice(sodium.crypto_box_NONCEBYTES);

            // 3. Deciphering
            const decryptedBytes = sodium.crypto_box_open_easy(ciphertext, nonce, senderPubKey, this.myPrivateKey);
            
            // 4. Returning the text
            return sodium.to_string(decryptedBytes);
            
        } catch (error) {
            console.error("[Crypto] Error decrypting message. The key may have been changed.", error);
            
            return "⚠️ [The message cannot be decrypted]";
        }
    }
};
