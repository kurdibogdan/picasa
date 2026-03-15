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

$baseDir = 'SharedPhotos/';

// Thumbnail készítő függvény: 50x50 px, JPEG, 50% minőség
function createThumbnail($sourcePath, $thumbPath) {
    $ext = strtolower(pathinfo($sourcePath, PATHINFO_EXTENSION));
    switch ($ext) {
        case 'jpg':
        case 'jpeg':
            $img = @imagecreatefromjpeg($sourcePath);
            break;
        case 'png':
            $img = @imagecreatefrompng($sourcePath);
            break;
        case 'gif':
            $img = @imagecreatefromgif($sourcePath);
            break;
        default:
            return false;
    }
    if (!$img) return false;

    $thumb = imagecreatetruecolor(50, 50);
    // PNG és GIF átlátszóság kezelése
    if ($ext === 'png' || $ext === 'gif') {
        imagealphablending($thumb, false);
        imagesavealpha($thumb, true);
    }
    imagecopyresampled($thumb, $img, 0, 0, 0, 0, 50, 50, imagesx($img), imagesy($img));
    $result = imagejpeg($thumb, $thumbPath, 50);
    imagedestroy($img);
    imagedestroy($thumb);
    return $result;
}

// 1. Lista kérése
if (isset($_GET['action']) && $_GET['action'] === 'list') {
    // Relatív alútvonal kezelése (pl. "kották/")
    $subPath = '';
    if (isset($_GET['path'])) {
        // Biztonsági ellenőrzés: ne engedjünk ki a base könyvtárból
        $subPath = str_replace('\\', '/', $_GET['path']);
        $subPath = trim($subPath, '/');
        if ($subPath !== '') {
            // ".." kiszűrése
            $parts = explode('/', $subPath);
            foreach ($parts as $part) {
                if ($part === '..' || $part === '.') {
                    echo json_encode(array('error' => 'Invalid path'));
                    exit;
                }
            }
            $subPath .= '/';
        }
    }
    $dir = $baseDir . $subPath;

    $items = array();
    if (is_dir($dir)) {
        $handle = opendir($dir);
        while (false !== ($entry = readdir($handle))) {
            if ($entry === '.' || $entry === '..') continue;
            // Kiskép fájlokat ne listázzuk
            if (substr($entry, -7) === '.kiskep') continue;

            $fullPath = $dir . $entry;

            if (is_dir($fullPath)) {
                // Mappa
                $items[] = array(
                    'name' => $entry,
                    'type' => 'folder',
                    'date' => date('Y-m-d H:i:s', filemtime($fullPath)),
                    'thumbnail' => ''
                );
            } else {
                // Fájl - csak képeket listázunk
                $ext = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
                if (in_array($ext, array('jpg', 'jpeg', 'png', 'gif'))) {
                    $thumbName = $entry . '.kiskep';
                    $thumbPath = $dir . $thumbName;

                    // Thumbnail létrehozása ha még nincs
                    if (!file_exists($thumbPath)) {
                        createThumbnail($fullPath, $thumbPath);
                    }

                    $items[] = array(
                        'name' => $entry,
                        'type' => 'file',
                        'date' => date('Y-m-d H:i:s', filemtime($fullPath)),
                        'thumbnail' => $thumbName
                    );
                }
            }
        }
        closedir($handle);
    }
    echo json_encode($items);
    exit;
}

// 2. Egy konkrét kép beolvasása Base64-be a küldéshez
if (isset($_GET['file'])) {
    $subPath = '';
    if (isset($_GET['path'])) {
        $subPath = str_replace('\\', '/', $_GET['path']);
        $subPath = trim($subPath, '/');
        if ($subPath !== '') {
            $parts = explode('/', $subPath);
            foreach ($parts as $part) {
                if ($part === '..' || $part === '.') {
                    echo json_encode(array('error' => 'Invalid path'));
                    exit;
                }
            }
            $subPath .= '/';
        }
    }
    $filePath = $baseDir . $subPath . basename($_GET['file']);
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
