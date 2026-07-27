<?php
/**
 * Gaia Label Studio — single-user cloud sync endpoint.
 * Upload to Hostinger: public_html/studio/sync/sync.php
 * Copy config.php.example → config.php and set token.
 */
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: X-Gaia-Sync-Token, Content-Type');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$configFile = __DIR__ . '/config.php';
if (!file_exists($configFile)) {
    http_response_code(503);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Sync not configured on server']);
    exit;
}

$config = require $configFile;
$expected = (string) ($config['token'] ?? '');
$provided = (string) ($_SERVER['HTTP_X_GAIA_SYNC_TOKEN'] ?? '');

if ($expected === '' || $expected === 'CHANGE_ME_TO_A_LONG_RANDOM_SECRET' || !hash_equals($expected, $provided)) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$dataDir = __DIR__ . '/data';
$dataFile = $dataDir . '/latest.json';
$metaFile = $dataDir . '/meta.json';

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['meta'])) {
    header('Content-Type: application/json');
    if (!is_file($metaFile)) {
        echo json_encode(['exportedAt' => null, 'size' => 0]);
        exit;
    }
    readfile($metaFile);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!is_file($dataFile)) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'No backup yet']);
        exit;
    }
    header('Content-Type: application/json');
    readfile($dataFile);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = file_get_contents('php://input');
    if ($body === false || $body === '') {
        http_response_code(400);
        exit;
    }
    $parsed = json_decode($body, true);
    if (!is_array($parsed) || ($parsed['app'] ?? '') !== 'gaia-label-studio') {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Invalid Gaia backup']);
        exit;
    }
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0750, true);
    }
    $tmp = $dataFile . '.tmp';
    if (file_put_contents($tmp, $body) === false) {
        http_response_code(500);
        exit;
    }
    rename($tmp, $dataFile);
    $meta = json_encode([
        'exportedAt' => $parsed['exportedAt'] ?? gmdate('c'),
        'size' => strlen($body),
    ]);
    file_put_contents($metaFile, $meta);
    header('Content-Type: application/json');
    echo $meta;
    exit;
}

http_response_code(405);
header('Content-Type: application/json');
echo json_encode(['error' => 'Method not allowed']);
