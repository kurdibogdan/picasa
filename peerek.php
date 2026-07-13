<?php
/*
    Peerek nyilvántartása.
    1. Bejelentkezés saját ID-val.
    2. Többiek kilistázása.
*/

header("Content-Type: application/json");

$LOCALHOST = in_array($_SERVER['REMOTE_ADDR'], ['127.0.0.1', '::1']);
$DB = "online_peerek.json";
$PEER_LEJARAT_IDEJE = 15; // másodperc
$sajat_id = isset($_GET['sajat_id']) ? $_GET['sajat_id'] : null;

if ($LOCALHOST === true) {
    // Ha helyileg fut, akkor a távoli szerveren regisztrálja be magát a peer.
    echo file_get_contents("https://kurdi.eu/bogdan/picasa/peerek.php?sajat_id=$sajat_id");
}
else {
    // Ha szerveren fut, akkor a saját adatbázisát használja a peerek nyilvántartására.

    $peerek = file_exists($DB) ? json_decode(file_get_contents($DB), true) : array();

    // Frissítjük a saját időbélyegünket
    if ($sajat_id) {
      $peerek[$sajat_id] = time();
    }

    // Inaktív peerek törlése:
    $most = time();
    $aktiv_peerek = array();
    foreach ($peerek as $id => $ido) {
        if (($most - $ido) < $PEER_LEJARAT_IDEJE) {
            $aktiv_peerek[$id] = $ido;
        }
    }

    // Aktív peerek mentése, kilistázása:
    file_put_contents($DB, json_encode($aktiv_peerek));  // [ {peerdId: időbélyegző}, ...]
    echo json_encode(array_keys($aktiv_peerek));              // [ peerId, peerId, ... ]
}
?>
