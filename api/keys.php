<?php
// api/keys.php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

// GET /api/keys.php?user_id=123
if ($method === 'GET') {
    $target_user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;

    if (!$target_user_id) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing user_id']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT public_key FROM e2ee_user_keys WHERE user_id = ?");
    $stmt->execute([$target_user_id]);
    $row = $stmt->fetch();

    if ($row) {
        echo json_encode(['public_key' => $row['public_key']]);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Key not found']);
    }
    exit;
}

// POST /api/keys.php
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $public_key = $input['public_key'] ?? '';

    // Validation: X25519 in base64url
    if (empty($public_key) || strlen($public_key) < 40) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid public key format']);
        exit;
    }

    $stmt = $pdo->prepare("
        INSERT INTO e2ee_user_keys (user_id, public_key) 
        VALUES (?, ?) 
        ON DUPLICATE KEY UPDATE public_key = VALUES(public_key), updated_at = CURRENT_TIMESTAMP
    ");
    $stmt->execute([$current_user_id, $public_key]);

    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method Not Allowed']);
