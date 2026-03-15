<?php
// local_photos.php - A megosztó gépén fut
// Engedélyezzük a kérést bárhonnan
header('Access-Control-Allow-Origin: *'); // Hogy a weboldalad elérje
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Ha a böngésző csak ellenőrizni akarja a jogosultságot (Preflight)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    header("HTTP/1.1 200 OK");
    exit(); // Az OPTIONS kérésre azonnal üres választ adunk
}

header('Content-Type: application/json');

$dir = 'SharedPhotos/';

// 1. Lista kérése
if (isset($_GET['action']) && $_GET['action'] === 'list') {
    $files = array();
    if (is_dir($dir)) {
        $handle = opendir($dir);
        while (false !== ($entry = readdir($handle))) {
            if ($entry != "." && $entry != ".." && !is_dir($dir.$entry)) {
                // Csak képeket adjunk hozzá (egyszerű ellenőrzés)
                $ext = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
                if (in_array($ext, array('jpg', 'jpeg', 'png', 'gif'))) {
                    $files[] = $entry;
                }
            }
        }
        closedir($handle);
    }
    echo json_encode($files);
    exit;
}

// 2. Egy konkrét kép beolvasása Base64-be a küldéshez
if (isset($_GET['file'])) {
    $filePath = $dir . basename($_GET['file']);
    if (file_exists($filePath)) {
        $data = file_get_contents($filePath);
        $type = pathinfo($filePath, PATHINFO_EXTENSION);
        // Visszaadjuk az adatot, amit a JS közvetlenül elküldhet a Peer-nek
        echo json_encode(array(
            'filename' => $_GET['file'],
            'data' => 'data:image/' . $type . ';base64,' . base64_encode($data)
        ));
    }
    exit;
}
?>
