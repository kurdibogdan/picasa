<?php
/*
    Peerek nyilvántartása.
    1. Bejelentkezés saját ID-val.
    2. Többiek kilistázása.
*/

header("Content-Type: application/json");
$LOCALHOST = in_array($_SERVER['REMOTE_ADDR'], ['127.0.0.1', '::1']);
$sajat_id = isset($_GET['sajat_id']) ? $_GET['sajat_id'] : null;

if ($LOCALHOST === true) {
    // Ha helyileg fut, akkor a távoli szerveren regisztrálja be magát a peer.
    echo file_get_contents("https://kurdi.eu/bogdan/picasa/peers.php?sajat_id=$sajat_id");
}
else {
    // Ha szerveren fut, akkor a saját adatbázisát használja a peerek nyilvántartására.
    $STORAGE = "online_peers.json";
    $PEER_EXPIRE_TIME = 15; // másodperc

    $peers = file_exists($STORAGE) ? json_decode(file_get_contents($STORAGE), true) : array();

    // Frissítjük a saját időbélyegünket
    if ($sajat_id) {
      $peers[$sajat_id] = time();
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
}
?>
