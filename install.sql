```sql
-- =========================================================
-- PHP E2EE Messenger
-- Database installation schema
-- =========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =========================================================
-- Table: e2ee_user_keys
-- Stores one active public key per user
-- =========================================================

CREATE TABLE IF NOT EXISTS e2ee_user_keys (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id INT UNSIGNED NOT NULL,

    -- X25519 public key
    -- Stored as base64url string
    -- 32 bytes -> ~44 chars
    public_key VARCHAR(64) NOT NULL COMMENT 'X25519 public key (base64url)',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    -- One active key per user
    UNIQUE KEY uq_user (user_id)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- Table: e2ee_messages
-- Stores encrypted messages only
-- =========================================================

CREATE TABLE IF NOT EXISTS e2ee_messages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    sender_id INT UNSIGNED NOT NULL,

    recipient_id INT UNSIGNED NOT NULL,

    -- Encrypted payload:
    -- base64url(nonce + ciphertext + mac)
    ciphertext TEXT NOT NULL,

    is_read TINYINT(1) NOT NULL DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- =====================================================
    -- Indexes
    -- =====================================================

    -- Conversation lookups
    INDEX idx_conversation (sender_id, recipient_id),

    -- Inbox / unread messages
    INDEX idx_recipient (recipient_id, is_read),

    -- Sorting and cleanup
    INDEX idx_created (created_at)

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
```
