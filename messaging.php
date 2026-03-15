<?php
/*
1. A szerver oldali "Postafiók" (messaging.php)
Ez a fájl fogadja a küldött üzeneteket és kiszolgálja a várakozóknak.
A példa kedvéért egy messages.json fájlt használunk adatbázis helyett,
hogy ne kelljen MySQL-t konfigurálnod.
*/
// messaging.php

// Letiltjuk a PHP hibaüzenetek megjelenítését a kimeneten, hogy ne rontsák el a JSON-t
// error_reporting(0);
header('Content-Type: application/json');

$file = 'messages.json';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if ($data) {
        $allMessages = file_exists($file) ? json_decode(file_get_contents($file), true) : array();
        if (!is_array($allMessages)) { $allMessages = array(); }
        
        $allMessages[] = $data;
        file_put_contents($file, json_encode($allMessages));
    }
    echo json_encode(array('status' => 'ok'));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $myId = isset($_GET['myId']) ? $_GET['myId'] : '';
    $myMessages = array();

    if (file_exists($file)) {
        $content = file_get_contents($file);
        $allMessages = json_decode($content, true);
        
        if (is_array($allMessages)) {
            $remaining = array();
            foreach ($allMessages as $m) {
                if (isset($m['receiverId']) && $m['receiverId'] === $myId) {
                    $myMessages[] = $m;
                } else {
                    $remaining[] = $m;
                }
            }
            file_put_contents($file, json_encode($remaining));
        }
    }
    // Mindig küldünk legalább egy üres tömböt: []
    echo json_encode(array_values($myMessages));
    exit;
}
?>
