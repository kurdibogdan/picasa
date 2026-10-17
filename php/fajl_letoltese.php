<?php
header('Content-Type: text/html; charset=utf-8');
include("kapcsolat.php");

function fajl_letoltese($utvonal) {
    global $LOCALHOST;
    $MEGOSZTASI_MAPPA = "../SharedPhotos";

    // Normalizáljuk az elérési utat
    $utvonal = rawurldecode($utvonal);
    $utvonal = str_replace('\\', '/', $utvonal);
    $utvonal = trim($utvonal, '/');
    
    // Biztonsági ellenőrzés: ".." tiltása
    $darabok = explode('/', $utvonal);
    foreach ($darabok as $darab) {
        if ($darab === '..' || $darab === '.') {
            echo "Tiltott útvonal: $darab\n";
            return false;
        }
    }
    
    $teljes_utvonal = $MEGOSZTASI_MAPPA."/".$utvonal;
    
    // Karakterkódolás beállítása:
    if ($LOCALHOST == true) {
        $teljes_utvonal = mb_convert_encoding($teljes_utvonal, "ISO-8859-1", "UTF-8");
    }
    else {
        $teljes_utvonal = urldecode($teljes_utvonal);
    }
    
    if (file_exists($teljes_utvonal)) {
        $data = file_get_contents($teljes_utvonal);
        $type = pathinfo($teljes_utvonal, PATHINFO_EXTENSION);
        return 'data:image/' . $type . ';base64,' . base64_encode($data);
    }
    
    return json_encode(array("error" => "File not found or invalid path"));
}

function fajl_letoltese_stream($utvonal) { // AI
    global $LOCALHOST;
    $MEGOSZTASI_MAPPA = "../SharedPhotos";

    $utvonal = rawurldecode($utvonal);
    $utvonal = str_replace('\\', '/', $utvonal);
    $utvonal = trim($utvonal, '/');

    $darabok = explode('/', $utvonal);
    foreach ($darabok as $darab) {
        if ($darab === '..' || $darab === '.') {
            return false;
        }
    }

    $teljes_utvonal = $MEGOSZTASI_MAPPA."/".$utvonal;

    if ($LOCALHOST == true) {
        $teljes_utvonal = mb_convert_encoding($teljes_utvonal, "ISO-8859-1", "UTF-8");
    }
    else {
        $teljes_utvonal = urldecode($teljes_utvonal);
    }

    if (!file_exists($teljes_utvonal) || !is_file($teljes_utvonal)) {
        return false;
    }

    $fajl_nev = basename($teljes_utvonal);
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . $fajl_nev . '"');
    header('Content-Length: ' . filesize($teljes_utvonal));
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    header('X-Accel-Buffering: no');

    $fp = fopen($teljes_utvonal, 'rb');
    if ($fp === false) {
        return false;
    }

    $chunk_size = 64 * 1024;
    while (!feof($fp)) {
        $chunk = fread($fp, $chunk_size);
        if ($chunk === false) {
            break;
        }
        echo $chunk;
        @ob_flush();
        flush();
    }
    fclose($fp);

    return true;
}
