<?php
// api/contacts.php
require_once 'config.php';

$stmt = $pdo->prepare("
    SELECT 
        CASE 
            WHEN sender_id = ? THEN recipient_id 
            ELSE sender_id 
        END as contact_id,
        MAX(created_at) as last_message_time,
        SUM(CASE WHEN recipient_id = ? AND is_read = 0 THEN 1 ELSE 0 END) as unread_count
    FROM e2ee_messages
    WHERE sender_id = ? OR recipient_id = ?
    GROUP BY contact_id
    ORDER BY last_message_time DESC
");

$stmt->execute([
    $current_user_id, // for contact_id
    $current_user_id, // for unread_count
    $current_user_id, // WHERE I am the sender
    $current_user_id  // WHERE I am the recipient
]);

$contacts = $stmt->fetchAll();

echo json_encode(['contacts' => $contacts]);
