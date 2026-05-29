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
