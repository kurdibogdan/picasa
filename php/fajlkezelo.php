<?php
// local_photos.php - A megosztó gépén fut
// error_reporting(E_ALL);
// ini_set('display_errors', '0');

// Engedélyezzük a kérést bárhonnan
header('Access-Control-Allow-Origin: *');
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Ha a böngésző csak ellenőrizni akarja a jogosultságot (Preflight)
if ($_SERVER['REQUEST_METHOD'] == "OPTIONS") {
    header("HTTP/1.1 200 OK");
    exit(); // Az OPTIONS kérésre azonnal üres választ adunk
}

//header('Content-Type: application/json; charset=utf-8');
include("kapcsolat.php");
include("fajllista.php");
include("fajl_letoltese.php");

$parancs = get("action");
$utvonal = get("path");

switch($parancs){
    case "list": // Lista kérése JSON formában
        echo fajllista($utvonal);
        break;
    case "file": // Egy konkrét kép beolvasása Base64-be a küldéshez
        echo fajl_letoltese($utvonal);
        break;
    default:
        break;
}
?>