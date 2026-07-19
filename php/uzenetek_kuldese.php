<?php
include("kapcsolat.php");

if ($LOCALHOST === true) {
    // Ha helyileg fut, akkor a távoli szerverre küldi az üzeneteket.
    $uzenet = json_decode(file_get_contents("php://input"), true);
    $url = 'https://kurdi.eu/bogdan/picasa/php/uzenetek_kuldese.php';    
    $options = [
        'http' => [
            'method'  => 'POST',
            'header'  => 'Content-type: application/x-www-form-urlencoded',
            'content' => json_encode($uzenet),
        ],
    ];
    $context  = stream_context_create($options);
    $response = file_get_contents($url, false, $context);
    echo $response;
}
else {
    // Ha távoli szerveren fut, akkor a távoli adatbázisba mentjük az üzenetet.

    if ($_SERVER['REQUEST_METHOD'] === "POST") {
      $uzenet = json_decode(file_get_contents("php://input"), true);
      
      if ($uzenet) {
        $kapcsolat->query("
          INSERT INTO uzenetek (kuldo_id, cimzett_id, torzs)
          VALUES (
            '".$uzenet['kuldo_id']."',
            '".$uzenet['cimzett_id']."',
            '".json_encode($uzenet['torzs'])."'
          )
        ");
      }
      
      echo json_encode(array("status" => "ok"));
      exit;
    }
}
?>