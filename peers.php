<?php
/*
peers.php – Online státusz kezelő
Ezt a fájlt kell meghívni, hogy tudd, ki van éppen az oldalon.
*/
// peers.php
$storage = 'online_peers.json';
$peers = file_exists($storage) ? json_decode(file_get_contents($storage), true) : array();
$myId = isset($_GET['myId']) ? $_GET['myId'] : null;
$action = isset($_GET['action']) ? $_GET['action'] : 'list';

if ($myId) {
    // Frissítjük a saját időbélyegünket
    $peers[$myId] = time();
}

// Takarítás régebbi szintaktikával:
$now = time();
$activePeers = array();

foreach ($peers as $id => $timestamp) {
    // Aki 15 másodpercen belül jelentkezett, azt megtartjuk
    if (($now - $timestamp) < 15) {
        $activePeers[$id] = $timestamp;
    }
}

file_put_contents($storage, json_encode($activePeers));

if ($action === 'list') {
    $resultList = array();
    foreach ($activePeers as $id => $timestamp) {
        if ($id !== $myId) {
            $resultList[] = $id;
        }
    }
    echo json_encode($resultList);
}
?>
