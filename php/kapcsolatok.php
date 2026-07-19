<?php
/*
    kapcsolatok nyilvántartása.
    1. Bejelentkezés saját ID-val.
    2. Többiek kilistázása.
*/

header("Content-Type: application/json");
include("kapcsolat.php");

$sajat_id = get("sajat_id");

if ($LOCALHOST === true) {
    // Ha helyileg fut, akkor a távoli szerveren regisztrálja be magát a peer.
    // PHP-val hidaljuk át a "same-origin request" hibát.
    echo file_get_contents("https://kurdi.eu/bogdan/picasa/php/kapcsolatok.php?sajat_id=$sajat_id");
}
else {
    // Ha szerveren fut, akkor a saját adatbázisát használja a kapcsolatok nyilvántartására.
    /*
        DELETE
        FROM kapcsolatok
        WHERE ido > $KAPCSOLAT_LEJARAT_IDEJE;
        
        SELECT *
        FROM kapcsolatok;
    */
    
    $DB = "online_kapcsolatok.json";
    $KAPCSOLAT_LEJARAT_IDEJE = 15; // másodperc
    
    $kapcsolatok = file_exists($DB) ? json_decode(file_get_contents($DB), true) : array();

    // Frissítjük a saját idõbélyegünket
    if ($sajat_id) {
      $kapcsolatok[$sajat_id] = time();
    }

    // Inaktív kapcsolatok törlése:
    $most = time();
    $aktiv_kapcsolatok = array();
    foreach ($kapcsolatok as $id => $ido) {
        if (($most - $ido) < $KAPCSOLAT_LEJARAT_IDEJE) {
            $aktiv_kapcsolatok[$id] = $ido;
        }
    }

    // Aktív kapcsolatok mentése, kilistázása:
    file_put_contents($DB, json_encode($aktiv_kapcsolatok));  // [ {peerdId: idõbélyegzõ}, ...]
    echo json_encode(array_keys($aktiv_kapcsolatok));         // [ peerId, peerId, ... ]
}
?>
