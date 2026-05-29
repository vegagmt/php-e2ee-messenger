<?php
// api/config.php

declare(strict_types=1);

session_start();

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$current_user_id = (int)$_SESSION['user_id'];

$db_host = '127.0.0.1';
$db_name = 'main';
$db_user = 'user';
$db_pass = '123456';

try {
    
    $pdo = new PDO(
        "mysql:host=$db_host;dbname=$db_name;charset=utf8mb4",
        $db_user,
        $db_pass,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, 
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       
            PDO::ATTR_EMULATE_PREPARES   => false,                  
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    // devmode $e->getMessage() 
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}