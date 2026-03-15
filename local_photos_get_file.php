<?php
// local_photos_get_file.php - Fájl lekérés kezelése

function getFile($fullPath) {
    // Normalizáljuk az elérési utat
    $fullPath = str_replace('\\', '/', $fullPath);
    $fullPath = trim($fullPath, '/');
    
    // Biztonsági ellenőrzés: ".." tiltása
    $parts = explode('/', $fullPath);
    foreach ($parts as $part) {
        if ($part === '..' || $part === '.') {
            return false;
        }
    }
    
    // A fájlnév UTF-8-ból érkezik, lehet hogy konvertálni kell a fájlrendszer kódolásához
    if (!file_exists($fullPath)) {
        $fullPath = mb_convert_encoding($fullPath, 'ISO-8859-2', 'UTF-8');
    }
    
    // Csak az adatot adjuk vissza base64-ben
    if (file_exists($fullPath)) {
        $data = file_get_contents($fullPath);
        $type = pathinfo($fullPath, PATHINFO_EXTENSION);
        return 'data:image/' . $type . ';base64,' . base64_encode($data);
    }
    
    return false;
}

