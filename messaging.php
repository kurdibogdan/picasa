<?php
/*
  A szerver oldali "Postafiók" (messaging.php)
  Ez a fájl fogadja a küldött üzeneteket és kiszolgálja a várakozóknak.
*/

// error_reporting(0);
header("Content-Type: application/json");
$db = "messages.json";

// Üzenet fogadása:
if ($_SERVER['REQUEST_METHOD'] === "POST") {
  $input = file_get_contents("php://input");
  $data = json_decode($input, true);
  
  if ($data) {
    $allMessages = file_exists($db)
                 ? json_decode(file_get_contents($db), true)
                 : array();
    if (!is_array($allMessages)) { $allMessages = array(); }
    
    array_push($allMessages, $data);
    file_put_contents($db, json_encode($allMessages));
  }
  echo json_encode(array("status" => "ok"));
  exit;
}

// Üzenetek továbbítása - ID alapján visszaadja a felhasználónak szánt üzeneteket:
// Amit továbbít, azt törli is az adatbázisból.
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  $myId = isset($_GET['myId']) ? $_GET['myId'] : "";
  $myMessages = array();
  
  if (file_exists($db)) {
    $content = file_get_contents($db);
    $allMessages = json_decode($content, true);
    
    if (is_array($allMessages)) {
      $remaining = array();
      foreach ($allMessages as $m) {
        if (isset($m['receiverId']) and $m['receiverId'] === $myId) {
            array_push($myMessages, $m);
        } else {
          array_push($remaining, $m);
        }
      }
      file_put_contents($db, json_encode($remaining));
    }
  }
  echo json_encode(array_values($myMessages));
  exit;
}
?>