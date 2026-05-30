<?php
// messenger.php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['user_id'])) {
    die("Please log in to the site to access secure messages..");
}

 

$my_user_id = (int)$_SESSION['user_id'];

 

header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none';");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: SAMEORIGIN");
header("Referrer-Policy: strict-origin-when-cross-origin");
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
 
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content">
    <meta name="theme-color" content="#0088cc">
    <title>E2EE Private Messages</title>
    <link rel="stylesheet" href="/css/messenger.css">
</head>
<body>
<div class="messenger-container" id="messenger-container">
    <aside class="sidebar" role="navigation" aria-label="List of dialogues">
        <div class="sidebar-header">
            <h2>Dialogues</h2>
            <div class="my-id-badge" title="Ваш ID в системе">ID: <?= $my_user_id ?></div>
        </div>
        <div id="contacts-list" class="contacts-list" role="list">
            <div class="loading-text" aria-live="polite">Loading...</div>
        </div>
    </aside>
    <main class="chat-area" role="main">        
        <div id="empty-chat-placeholder" class="empty-chat-placeholder" aria-hidden="true">
            <p>Select a conversation to start a secure conversation. 🔒</p>
        </div>

        <div id="chat-window" class="chat-window" style="display: none;">

            <div class="chat-header">
                <button
                    class="btn-back"
                    id="btn-back"
                    aria-label="Return to the list of dialogues"
                    title="Back"                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2.2"
                         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polyline points="15 18 9 12 15 6"/>
                    </svg>
                </button>

                <div class="chat-header-info">                    
                    <div id="chat-avatar" class="contact-avatar" aria-hidden="true"></div>
                    <div class="chat-header-text">
                        <h3 id="chat-title">Chat</h3>
                        <div class="chat-subtitle">🔒 End-to-end encryption</div>
                    </div>
                </div>
            </div>

            <div id="chat-messages"
                 class="chat-messages"
                 role="log"
                 aria-label="Messages"
                 aria-live="polite">
            </div>

            <div class="chat-input-area">
                <textarea
                    id="message-input"
                    placeholder="Message..."
                    rows="1"
                    aria-label="Enter a Send a message"
                    autocomplete="off"
                    autocorrect="on"
                    spellcheck="true"
                ></textarea>
                <button id="send-btn" title="Send" aria-label="Send a message" disabled>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
                         stroke="currentColor" stroke-width="2" stroke-linecap="round"
                         stroke-linejoin="round" aria-hidden="true">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                </button>
            </div>
        </div>
    </main>
</div>

<script src="js/lib/sodium.js"></script>
<script src="js/storage.js"></script>
<script src="js/api.js"></script>
<script src="js/crypto.js"></script>
<script src="js/messenger.js"></script>

<script>
  
    const MY_USER_ID  = <?= $my_user_id ?>;

    document.addEventListener('DOMContentLoaded', async () => {
        const container  = document.getElementById('messenger-container');
        const chatWindow = document.getElementById('chat-window');
        const placeholder= document.getElementById('empty-chat-placeholder');
        const btnBack    = document.getElementById('btn-back');
        const textarea   = document.getElementById('message-input');

        // ── NAV ──────────────────────────────────────────

        
        MessengerApp.openChat = (() => {
            const original = MessengerApp.openChat.bind(MessengerApp);
            return async (peerId) => {
                placeholder.style.display = 'none';
                chatWindow.style.display  = 'flex';
                container.dataset.view    = 'chat'; 
                await original(peerId);
            };
        })();
        
        MessengerApp.closeChat = () => {
            delete container.dataset.view;
            setTimeout(() => { chatWindow.style.display = 'none'; }, 250);
        };

        
        btnBack.addEventListener('click', () => MessengerApp.closeChat());        
        let touchStartX = 0;
        container.addEventListener('touchstart', e => {
            touchStartX = e.touches[0].clientX;
        }, { passive: true });
        container.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - touchStartX;            
            if (dx > 80 && touchStartX < 50 && container.dataset.view === 'chat') {
                MessengerApp.closeChat();
            }
        }, { passive: true });
        
        const sendBtn = document.getElementById('send-btn');

        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
            sendBtn.disabled = textarea.value.trim() === '';
        });

        // ── send Ctrl/Cmd+Enter ──
        textarea.addEventListener('keydown', e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                document.getElementById('send-btn').click();
            }
        });       
        await MessengerApp.init(MY_USER_ID);        
        const startChatId = parseInt(new URLSearchParams(location.search).get('chat_with'), 10);
        if (startChatId && startChatId !== MY_USER_ID) {
            MessengerApp.openChat(startChatId);
        }
    });
</script>
</body>
</html>
