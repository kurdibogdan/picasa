<?php
/*
    kapcsolatok nyilvántartása.
    1. Bejelentkezés saját ID-val.
    2. Többiek kilistázása.
*/

include("kapcsolat.php");

$sajat_id = get("sajat_id");

if ($LOCALHOST === true) {
    // Ha helyileg fut, akkor a távoli szerveren regisztrálja be magát a peer.
    // PHP-val hidaljuk át a "same-origin request" hibát.
    echo file_get_contents("https://kurdi.eu/bogdan/picasa/php/kapcsolatok.php?sajat_id=$sajat_id");
}
else {
    // Ha szerveren fut, akkor a saját adatbázisát használja a kapcsolatok nyilvántartására.    
    $KAPCSOLAT_LEJARAT_IDEJE = 15; // másodperc
    $MOST = date("Y-m-d H:i:s");
    
    // Saját aktivitás frissítése:
    $kapcsolat->query("
      UPDATE kapcsolatok
      SET utoljara_aktiv = '$MOST'
      WHERE id = $sajat_id;
    ");
    
    // Inaktív kapcsolatok törlése:
    $kapcsolat->query("
      DELETE
      FROM kapcsolatok
      WHERE utoljara_aktiv < datetime('$MOST', '-".$KAPCSOLAT_LEJARAT_IDEJE." seconds');
    ");
    
    // Aktív kapcsolatok kilistázása:
    $a = array();
    $q = $kapcsolat->query("
      SELECT *
      FROM kapcsolatok;
    ");
    while ($sor = $q->fetch(PDO::FETCH_ASSOC))
      array_push($a, $sor);
    echo json_encode($a);
}
?>
