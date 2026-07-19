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
