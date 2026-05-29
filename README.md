# php-e2ee-messenger v0.1

Simple End-to-End Encrypted (E2EE) private messaging module for PHP websites.

Built with:

* PHP 8
* MySQL
* Vanilla JavaScript
* libsodium.js

The server acts only as a dumb relay and never decrypts messages.

Designed as a simple drop-in solution for small websites and communities.

---

# Features

* End-to-End Encryption (E2EE)
* X25519 key exchange
* XChaCha20-Poly1305 authenticated encryption
* Vanilla JS frontend
* No frameworks
* No build tools
* Simple PHP backend
* Easy integration into existing websites
* Uses existing PHP sessions (`$_SESSION['user_id']`)
* Self-hosted crypto library support

---

# Security Model

This project is designed for:

* small communities
* hobby projects
* forums
* entertainment websites

The server stores:

* encrypted messages
* public keys

The server does NOT store:

* plaintext messages
* private keys

Private keys are stored locally in the user's browser using `localStorage`.

---

# Important Notes

This is not a military-grade messenger.

Security depends heavily on:

* XSS protection
* secure HTTPS configuration
* CSP headers
* trusted frontend code delivery

If your website is compromised, E2EE protection may fail.

---

# Requirements

* PHP 8+
* MySQL 5.7+ or MariaDB
* HTTPS
* Existing user authentication system

---

# Installation

## 1. Copy the files to your hosting

Copy the files to your hosting, enter the database access data in the php config file

---

## 2. Import database schema

Import `install.sql` into your MySQL database.

```bash
mysql -u root -p your_database < install.sql
```

---

## 3. Download libsodium.js

Download the official browser build from:

* https://github.com/jedisct1/libsodium.js
* https://download.libsodium.org/libsodium.js/

Place the files into:

```text
/js/lib/
```

Required files:

```text
sodium.js
sodium.wasm
```

---

## 4. Include messenger widget

Add `messenger.php` to your page:

```php
<?php include 'e2ee-messenger/messenger.php'; ?>
```

---

## 5. Session Authentication

Your website must already have authentication.

The messenger uses:

```php
$_SESSION['user_id']
```

Example:

```php
session_start();

if (!isset($_SESSION['user_id'])) {
    exit('Unauthorized');
}
```

---

# Project Structure

```text
e2ee-messenger/
├── README.md
├── install.sql
│
├── api/
│   ├── keys.php
│   ├── messages.php
│   └── contacts.php
│
├── js/
│   ├── lib/
│   │   └── sodium.js
│   │   └── sodium.wasm
│   │
│   ├── crypto.js
│   ├── storage.js
│   ├── api.js
│   └── messenger.js
│
├── css/
│   └── messenger.css
│
└── messenger.php
```

---

# Database Schema

## Public Keys

Stores one active public key per user.

```sql
CREATE TABLE e2ee_user_keys (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    public_key VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_user (user_id)
);
```

---

## Messages

Stores encrypted messages only.

```sql
CREATE TABLE e2ee_messages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sender_id INT UNSIGNED NOT NULL,
    recipient_id INT UNSIGNED NOT NULL,

    ciphertext TEXT NOT NULL,

    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

# Cryptography

This project uses:

* X25519 for key exchange
* XChaCha20-Poly1305 for encryption
* libsodium.js for browser cryptography

The server never receives plaintext messages.

---

# Limitations

* No multi-device sync
* No forward secrecy
* No encrypted backups
* Private keys are stored in browser localStorage
* If localStorage is deleted, message history may become unreadable

---

# Recommended Security Headers

Example CSP:

```http
Content-Security-Policy:
default-src 'self';
script-src 'self';
object-src 'none';
base-uri 'none';
frame-ancestors 'none';
```

Recommended:

* HTTPS only
* HttpOnly cookies
* SameSite cookies
* No inline scripts

---

# Integration Guide & UX Workflow (Must Read)

To avoid integration confusion, it is crucial to understand the core UX workflow of this module. This messenger behaves similarly to **Telegram's Secret Chats** (it is strictly device-bound).

### 1. The First-Time Activation Rule (Explicit Opt-In)
Because this is a zero-knowledge E2EE system, **User A cannot send a message to User B until User B has visited the messenger page at least once.**
* When a user opens `messenger.php` for the first time, their browser automatically generates their X25519 keys and uploads the public key to your database.
* If User A tries to open a chat with User B before User B has generated their keys, the API will return a `404 Key Not Found` error.

**Recommended integration on your main site:**
On your user profile pages, check if the target user has an active public key before displaying the chat link:

```php
// Inside your profile.php (or member card)
$stmt = $pdo->prepare("SELECT 1 FROM e2ee_user_keys WHERE user_id = ?");
$stmt->execute([$profile_user_id]);
$is_active = $stmt->fetchColumn();

if ($is_active) {
    echo '<a href="/messenger.php?chat_with=' . $profile_user_id . '" class="btn">Send Secure Message</a>';
} else {
    echo '<button disabled title="This user hasn\'t activated their secure chat yet">Chat Unavailable</button>';
}
```

### 2. Deep-Linking (Starting Chats)
To initiate or open a chat with a specific user from anywhere on your website, simply pass their user ID as a `chat_with` GET parameter:
```text
[https://yourwebsite.com/e2ee-messenger/messenger.php?chat_with=12927](https://yourwebsite.com/e2ee-messenger/messenger.php?chat_with=12927)
```

### 3. Browser Cache & New Device Behavior
Educate your users that clearing their browser's `localStorage` or logging in from a completely different device/browser will:
1. Permanently delete their current private key from that device.
2. Automatically generate a *new* keypair upon their next chat visit (updating the public key on the server).
3. **Render all previous chat history unreadable** (old messages will show a `⚠️ [Message cannot be decrypted]` warning). However, all new messages sent after this point will work perfectly.

---

# License

MIT License

---

# Disclaimer

This project is provided for educational and small community usage.

Do not use this messenger for:

* critical infrastructure
* government communications
* high-risk threat environments
* sensitive corporate secrets
