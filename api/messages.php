<?php
// api/messages.php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

// GET /api/messages.php?peer_id=123&last_id=10
if ($method === 'GET') {
    $peer_id = isset($_GET['peer_id']) ? (int)$_GET['peer_id'] : 0;
    $last_id = isset($_GET['last_id']) ? (int)$_GET['last_id'] : 0;

    if (!$peer_id) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing peer_id']);
        exit;
    }

    $stmt = $pdo->prepare("
        SELECT id, sender_id, recipient_id, ciphertext, created_at 
        FROM e2ee_messages 
        WHERE id > ? AND (
            (sender_id = ? AND recipient_id = ?) OR 
            (sender_id = ? AND recipient_id = ?)
        )
        ORDER BY id ASC
        LIMIT 100
    ");
    
   
    $stmt->execute([$last_id, $current_user_id, $peer_id, $peer_id, $current_user_id]);
    $messages = $stmt->fetchAll();
 
    if (!empty($messages)) {
        $mark_stmt = $pdo->prepare("UPDATE e2ee_messages SET is_read = 1 WHERE recipient_id = ? AND sender_id = ? AND is_read = 0");
        $mark_stmt->execute([$current_user_id, $peer_id]);
    }

    echo json_encode(['messages' => $messages]);
    exit;
}

// POST /api/messages.php
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $recipient_id = isset($input['recipient_id']) ? (int)$input['recipient_id'] : 0;
    $ciphertext = $input['ciphertext'] ?? '';

    if (!$recipient_id || empty($ciphertext)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid payload']);
        exit;
    }

    $stmt = $pdo->prepare("
        INSERT INTO e2ee_messages (sender_id, recipient_id, ciphertext) 
        VALUES (?, ?, ?)
    ");
    $stmt->execute([$current_user_id, $recipient_id, $ciphertext]);

    echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method Not Allowed']);
