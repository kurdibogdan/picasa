<?php
// local_photos.php - A megosztó gépén fut

// Hibák elrejtése, hogy ne rontsák el a JSON kimenetet
// error_reporting(E_ALL);
// ini_set('display_errors', '0');

// Engedélyezzük a kérést bárhonnan
header('Access-Control-Allow-Origin: *');
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Ha a böngésző csak ellenőrizni akarja a jogosultságot (Preflight)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    header("HTTP/1.1 200 OK");
    exit(); // Az OPTIONS kérésre azonnal üres választ adunk
}

header('Content-Type: application/json; charset=utf-8');

include("local_photos_thumbnail.php");
include("local_photos_get_file_list.php");
include("local_photos_get_file.php");

$baseDir = 'SharedPhotos/';
$action = ""; if (isset($_GET['action']) and $_GET['action'] != "") $action = $_GET['action'];
$path = ""; if (isset($_GET['path']) and $_GET['path'] != "") $path = $_GET['path'];
$fullPath = $baseDir.$path;

switch($action){
    case "list": // Lista kérése JSON formában
        echo getFileList($fullPath);
        break;
    case "file": // Egy konkrét kép beolvasása Base64-be a küldéshez
        echo getFile($fullPath);
        break;
    default:
        break;
}
?>