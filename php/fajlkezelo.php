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
include("fajllista.php");
include("fajl_letoltese.php");

$action = ""; if (isset($_GET['action']) and $_GET['action'] != "") $action = $_GET['action'];
$path = ""; if (isset($_GET['path']) and $_GET['path'] != "") $path = $_GET['path'];

switch($action){
    case "list": // Lista kérése JSON formában
        echo fajllista($path);
        break;
    case "file": // Egy konkrét kép beolvasása Base64-be a küldéshez
        echo fajl_letoltese($path);
        break;
    default:
        break;
}
?>