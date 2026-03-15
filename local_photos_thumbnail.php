<?php
// Thumbnail készítő függvény: max 100x100 px, arány megtartásával, JPEG, 60% minőség
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

    // Eredeti méretek lekérése
    $origWidth = imagesx($img);
    $origHeight = imagesy($img);
    
    // Arány megtartása mellett számítsuk ki az új méreteket
    // Maximum 100x100, de legalább egyik oldal 100px
    if ($origWidth >= $origHeight) {
        // Szélesebb vagy négyzet: szélesség legyen 100px
        $thumbWidth = 100;
        $thumbHeight = (int)round((100 * $origHeight) / $origWidth);
    } else {
        // Magasabb: magasság legyen 100px
        $thumbHeight = 100;
        $thumbWidth = (int)round((100 * $origWidth) / $origHeight);
    }

    $thumb = imagecreatetruecolor($thumbWidth, $thumbHeight);
    if (!$thumb) {
        imagedestroy($img);
        return false;
    }
    
    // PNG és GIF átlátszóság kezelése
    if ($ext === 'png' || $ext === 'gif') {
        imagealphablending($thumb, false);
        imagesavealpha($thumb, true);
    }
    imagecopyresampled($thumb, $img, 0, 0, 0, 0, $thumbWidth, $thumbHeight, $origWidth, $origHeight);
    $result = @imagejpeg($thumb, $thumbPath, 60);
    imagedestroy($img);
    imagedestroy($thumb);
    return $result;
}
?>