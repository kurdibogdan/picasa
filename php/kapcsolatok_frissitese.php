<?php
include("kapcsolat.php");
$sajat_id = get("sajat_id");

if ($LOCALHOST === true) {
    // Ha helyileg fut, akkor a távoli szerverrõl kéri le a bejelentkezett felhasználók listáját.
    echo file_get_contents("https://kurdi.eu/bogdan/picasa/php/kapcsolatok_frissitese.php?sajat_id=$sajat_id");
}
else {
    // Ha szerveren fut, akkor a saját adatbázisából adja vissza a felhasználók listáját.
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
