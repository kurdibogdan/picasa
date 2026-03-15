<?php
// local_photos.php - A megosztó gépén fut
// Hibák elrejtése, hogy ne rontsák el a JSON kimenetet
error_reporting(E_ALL);
ini_set('display_errors', '0');

// Output buffering indítása, hogy elkapjuk a nem kívánt kimeneteket
ob_start();

// Engedélyezzük a kérést bárhonnan
header('Access-Control-Allow-Origin: *'); // Hogy a weboldalad elérje
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Ha a böngésző csak ellenőrizni akarja a jogosultságot (Preflight)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    header("HTTP/1.1 200 OK");
    exit(); // Az OPTIONS kérésre azonnal üres választ adunk
}

header('Content-Type: application/json; charset=utf-8');

$baseDir = 'SharedPhotos/';

// Thumbnail készítő függvény: 50x50 px, JPEG, 50% minőség
function createThumbnail($sourcePath, $thumbPath) {
    // Ellenőrizzük, hogy a forrásfájl létezik és olvasható
    if (!file_exists($sourcePath) || !is_readable($sourcePath)) {
        error_log("Thumbnail creation failed: source file not readable: " . $sourcePath);
        return false;
    }
    
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
    if (!$img) {
        error_log("Thumbnail creation failed: could not create image from: " . $sourcePath);
        return false;
    }

    $thumb = imagecreatetruecolor(50, 50);
    if (!$thumb) {
        imagedestroy($img);
        return false;
    }
    
    // PNG és GIF átlátszóság kezelése
    if ($ext === 'png' || $ext === 'gif') {
        imagealphablending($thumb, false);
        imagesavealpha($thumb, true);
    }
    imagecopyresampled($thumb, $img, 0, 0, 0, 0, 50, 50, imagesx($img), imagesy($img));
    $result = @imagejpeg($thumb, $thumbPath, 50);
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
                    ob_clean();
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

            // UTF-8 verziót készítünk a JSON kimenethez, de az eredeti $entry-t használjuk fájlműveletekhez
            $entryUtf8 = $entry;
            if (!mb_check_encoding($entry, 'UTF-8')) {
                // Windows fájlrendszerről érkező fájlnév konvertálása UTF-8-ra
                // Magyar Windows rendszereken gyakran Windows-1250 vagy CP1252 encoding van
                $detected = mb_detect_encoding($entry, ['UTF-8', 'Windows-1250', 'Windows-1252', 'ISO-8859-2', 'ISO-8859-1'], true);
                if ($detected === false) {
                    $detected = 'Windows-1250'; // Alapértelmezett magyar Windows encoding
                }
                $entryUtf8 = mb_convert_encoding($entry, 'UTF-8', $detected);
            }

            if (is_dir($fullPath)) {
                // Mappa
                $items[] = array(
                    'name' => $entryUtf8,
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
                        'name' => $entryUtf8,
                        'type' => 'file',
                        'date' => date('Y-m-d H:i:s', filemtime($fullPath)),
                        'thumbnail' => $entryUtf8 . '.kiskep'
                    );
                }
            }
        }
        closedir($handle);
    }
    
    // Buffer törlése, csak a tiszta JSON-t küldjük
    ob_clean();
    
    $json = json_encode($items);
    if ($json === false) {
        error_log("JSON encode failed: " . json_last_error_msg());
        echo json_encode(array('error' => 'JSON encoding failed: ' . json_last_error_msg()));
    } else {
        echo $json;
    }
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
                    ob_clean();
                    echo json_encode(array('error' => 'Invalid path'));
                    exit;
                }
            }
            $subPath .= '/';
        }
    }
    
    // A fájlnév UTF-8-ból érkezik, lehet hogy konvertálni kell a fájlrendszer encoding-jához
    $fileName = basename($_GET['file']);
    $filePath = $baseDir . $subPath . $fileName;
    
    // Ha nem létezik UTF-8 néven, próbáljuk meg a helyi encoding-gal
    if (!file_exists($filePath)) {
        // Megpróbáljuk megtalálni a fájlt az összes fájl között
        $dirToSearch = $baseDir . $subPath;
        if (is_dir($dirToSearch)) {
            $handle = opendir($dirToSearch);
            while (false !== ($entry = readdir($handle))) {
                if ($entry === '.' || $entry === '..') continue;
                // UTF-8-ra konvertáljuk és összehasonlítjuk
                $entryUtf8 = $entry;
                if (!mb_check_encoding($entry, 'UTF-8')) {
                    $detected = mb_detect_encoding($entry, ['UTF-8', 'Windows-1250', 'Windows-1252', 'ISO-8859-2', 'ISO-8859-1'], true);
                    if ($detected === false) {
                        $detected = 'Windows-1250';
                    }
                    $entryUtf8 = mb_convert_encoding($entry, 'UTF-8', $detected);
                }
                if ($entryUtf8 === $fileName) {
                    $filePath = $dirToSearch . $entry;
                    break;
                }
            }
            closedir($handle);
        }
    }
    
    if (file_exists($filePath)) {
        // Buffer törlése, csak a tiszta JSON-t küldjük
        ob_clean();
        
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
