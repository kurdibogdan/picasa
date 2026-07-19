<?php
// error_reporting(0);
// header("Content-Type: application/json");
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
    $DB = "messages.json";

    // Üzenet fogadása:
    if ($_SERVER['REQUEST_METHOD'] === "POST") {
      $uzenet = json_decode(file_get_contents("php://input"), true);
      
      if ($uzenet) {
        $uzenetek = file_exists($DB)
                  ? json_decode(file_get_contents($DB), true)
                  : array();
        if (!is_array($uzenetek)){$uzenetek = array();}
        
        array_push($uzenetek, $uzenet);
        file_put_contents($DB, json_encode($uzenetek));
      }
      
      echo json_encode(array("status" => "ok"));
      exit;
    }
}
?>