<?php
// Üzenetek fogadása - ID alapján visszaadja a felhasználónak szánt üzeneteket.
// Amit továbbít, azt törli is az adatbázisból.

// header("Content-Type: application/json");
include("kapcsolat.php");

$sajat_id = get("sajat_id");

if ($LOCALHOST === true) {
    // Ha helyileg fut, akkor a távoli szerverről kéri le az üzeneteket.
    echo file_get_contents("https://kurdi.eu/bogdan/picasa/php/uzenetek_fogadasa.php?sajat_id=$sajat_id");
}
else {
    // Ha szerveren fut, akkor a szerveren lévő adatbázisból kéri le az üzeneteket.    
    // Új üzenetek olvasása:
    $q = $kapcsolat->query("
      SELECT *
      FROM uzenetek
      WHERE cimzett_id = '$sajat_id';
    ");
    $uzenetek = array();
    while ($uzenet = $q->fetch(PDO::FETCH_ASSOC))
      array_push($uzenetek, $uzenet);
    
    // Régi üzenetek törlése:
    $kapcsolat->query("
      DELETE
      FROM uzenetek
      WHERE cimzett_id = '$sajat_id';
    ");
    
    $kapcsolat = null;
    
    echo json_encode($uzenetek);
}
?>