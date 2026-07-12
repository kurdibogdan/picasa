<?php
// Üzenetek fogadása - ID alapján visszaadja a felhasználónak szánt üzeneteket.
// Amit továbbít, azt törli is az adatbázisból.

// error_reporting(0);
header("Content-Type: application/json");
$db = "messages.json";

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


if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $sajat_id = isset($_GET['sajat_id']) ? $_GET['sajat_id'] : "";
  $sajat_uzenetek = array();
  
  if (file_exists($db)) {
    $minden_uzenet = json_decode(file_get_contents($db), true);
    
    if (is_array($minden_uzenet)) {
      $kezbesitetlen_uzenetek = array();
      foreach ($minden_uzenet as $uzenet) {
        if (isset($uzenet['receiverId']) and $uzenet['receiverId'] === $sajat_id) {
            array_push($sajat_uzenetek, $uzenet);
        } else {
          array_push($kezbesitetlen_uzenetek, $uzenet);
        }
      }
      file_put_contents($db, json_encode($kezbesitetlen_uzenetek));
    }
  }
  echo json_encode(array_values($sajat_uzenetek));
  exit;
}

?>