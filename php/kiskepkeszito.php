<?php
// Kisképkészítő függvény: max 100x100 px, arány megtartásával, JPEG, 60% minőség
function kiskep_keszitese($kep_utvonal, $kiskep_utvonal) {
    if (!file_exists($kep_utvonal) || !is_readable($kep_utvonal)) {
        error_log("Nem sikerült kisképet létrehozni, a fájl nem olvasható: " . $kep_utvonal);
        return false;
    }
    
    $tipus = strtolower(pathinfo($kep_utvonal, PATHINFO_EXTENSION));
    switch ($tipus) {
        case 'jpg':
        case 'jpeg':
            $kep = @imagecreatefromjpeg($kep_utvonal);
            break;
        case 'png':
            $kep = @imagecreatefrompng($kep_utvonal);
            break;
        case 'gif':
            $kep = @imagecreatefromgif($kep_utvonal);
            break;
        case 'bmp':
            $kep = @imagecreatefrombmp($kep_utvonal);
            break;
        case 'webp':
            $kep = @imagecreatefromwebp($kep_utvonal);
            break;
        default:
            return false;
    }
    if (!$kep) {
        error_log("Nem sikerült kisképet létrehozni ebből a fájlból: " . $kep_utvonal);
        return false;
    }

    // Eredeti méretek lekérése
    $eredeti_szelesseg = imagesx($kep);
    $eredeti_magassag = imagesy($kep);
    
    // Arány megtartása mellett számítsuk ki az új méreteket
    // Maximum 100x100, de legalább egyik oldal 100px
    if ($eredeti_szelesseg >= $eredeti_magassag) {
        // Szélesebb vagy négyzet: szélesség legyen 100px
        $kiskep_szelesseg = 100;
        $kiskep_magassag = (int)round((100 * $eredeti_magassag) / $eredeti_szelesseg);
    } else {
        // Magasabb: magasság legyen 100px
        $kiskep_magassag = 100;
        $kiskep_szelesseg = (int)round((100 * $eredeti_szelesseg) / $eredeti_magassag);
    }

    $kiskep = imagecreatetruecolor($kiskep_szelesseg, $kiskep_magassag);
    if (!$kiskep) {
        imagedestroy($kep);
        return false;
    }
    
    // PNG és GIF átlátszóság kezelése
    if ($tipus === 'png' || $tipus === 'gif') {
        imagealphablending($kiskep, false);
        imagesavealpha($kiskep, true);
    }
    imagecopyresampled($kiskep, $kep, 0, 0, 0, 0, $kiskep_szelesseg, $kiskep_magassag, $eredeti_szelesseg, $eredeti_magassag);
    $eredmeny = @imagejpeg($kiskep, $kiskep_utvonal, 60);
    imagedestroy($kep);
    imagedestroy($kiskep);
    return $eredmeny;
}
?>