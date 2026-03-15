<?php
// Thumbnail készítő függvény: 100x100 px, JPEG, 60% minőség
function createThumbnail($sourcePath, $thumbPath) {
    if (!file_exists($sourcePath) || !is_readable($sourcePath)) {
        error_log("Nem sikerült kisképet létrehozni, a fájl nem olvasható: " . $sourcePath);
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
        case 'bmp':
            $img = @imagecreatefrombmp($sourcePath);
            break;
        case 'webp':
            $img = @imagecreatefromwebp($sourcePath);
            break;
        default:
            return false;
    }
    if (!$img) {
        error_log("Nem sikerült kisképet létrehozni ebből a fájlból: " . $sourcePath);
        return false;
    }

    $thumb = imagecreatetruecolor(100, 100);
    if (!$thumb) {
        imagedestroy($img);
        return false;
    }
    
    // PNG és GIF átlátszóság kezelése
    if ($ext === 'png' || $ext === 'gif') {
        imagealphablending($thumb, false);
        imagesavealpha($thumb, true);
    }
    imagecopyresampled($thumb, $img, 0, 0, 0, 0, 100, 100, imagesx($img), imagesy($img));
    $result = @imagejpeg($thumb, $thumbPath, 60);
    imagedestroy($img);
    imagedestroy($thumb);
    return $result;
}
?>