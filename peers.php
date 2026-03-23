<?php
/*
  peers.php – Online státusz kezelő
  Ezt a fájlt kell meghívni, hogy tudd, ki van éppen az oldalon.
*/

header("Content-Type: application/json");

$STORAGE = "online_peers.json";
$PEER_EXPIRE_TIME = 15; // másodperc

$peers = file_exists($STORAGE) ? json_decode(file_get_contents($STORAGE), true) : array();
$myId = isset($_GET['myId']) ? $_GET['myId'] : null;

// Frissítjük a saját időbélyegünket
if ($myId) {
  $peers[$myId] = time();
}

// Inaktív peerek törlése:
$now = time();
$activePeers = array();
foreach ($peers as $id => $timestamp) {
    if (($now - $timestamp) < $PEER_EXPIRE_TIME) {
        $activePeers[$id] = $timestamp;
    }
}

// Aktív peerek mentése, kilistázása:
file_put_contents($STORAGE, json_encode($activePeers));  // [ {peerdId: időbélyegző}, ...]
echo json_encode(array_keys($activePeers));              // [ peerId, peerId, ... ]
?>
