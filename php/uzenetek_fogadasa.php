<?php
// Üzenetek fogadása - ID alapján visszaadja a felhasználónak szánt üzeneteket.
// Amit továbbít, azt törli is az adatbázisból.

// error_reporting(0);
header("Content-Type: application/json");
$LOCALHOST = in_array($_SERVER['REMOTE_ADDR'], ['127.0.0.1', '::1']);
$sajat_id = isset($_GET['sajat_id']) ? $_GET['sajat_id'] : "";

if ($LOCALHOST === true) {
    // Ha helyileg fut, akkor a távoli szerverről kéri le az üzeneteket.
    echo file_get_contents("https://kurdi.eu/bogdan/picasa/php/uzenetek_fogadasa.php?sajat_id=$sajat_id");
}
else {
    // Ha szerveren fut, akkor a szerveren lévő adatbázisból kéri le az üzeneteket.
    $DB = "messages.json";

    /*
         (start transaction)
         
         SELECT *
         FROM uzenetek
         WHERE id = '$sajat_id';
         
         DELETE
         FROM uzenetek
         WHERE id = '$sajat_id';

         (end transaction)
    */

    $sajat_uzenetek = array();
    
    if (file_exists($DB)) {
      $minden_uzenet = json_decode(file_get_contents($DB), true);
      
      if (is_array($minden_uzenet)) {
        $kezbesitetlen_uzenetek = array();
        foreach ($minden_uzenet as $uzenet) {
          if (isset($uzenet['receiverId']) and $uzenet['receiverId'] === $sajat_id) {
              array_push($sajat_uzenetek, $uzenet);
          } else {
            array_push($kezbesitetlen_uzenetek, $uzenet);
          }
        }
        file_put_contents($DB, json_encode($kezbesitetlen_uzenetek));
      }
    }
    echo json_encode(array_values($sajat_uzenetek));
}
?>