<?php
// error_reporting(0);
header("Content-Type: application/json");
$db = "messages.json";

// Üzenet fogadása:
if ($_SERVER['REQUEST_METHOD'] === "POST") {
  $uzenet = json_decode(file_get_contents("php://input"), true);
  
  if ($uzenet) {
    $uzenetek = file_exists($db)
              ? json_decode(file_get_contents($db), true)
              : array();
    if (!is_array($uzenetek)){$uzenetek = array();}
    
    array_push($uzenetek, $uzenet);
    file_put_contents($db, json_encode($uzenetek));
  }
  
  echo json_encode(array("status" => "ok"));
  exit;
}
?>