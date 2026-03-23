<?php
// local_photos_get_file_list.php - Lista kérés kezelése

function getFileList($folderPath) {
    // Normalizáljuk az elérési utat
    $folderPath = str_replace('\\', '/', $folderPath);
    $folderPath = trim($folderPath, '/') . '/';
    
    // Biztonsági ellenőrzés: ".." tiltása
    $parts = explode('/', $folderPath);
    foreach ($parts as $part) {
        if ($part === "..") {
            return json_encode(array('error' => 'Invalid path'));
        }
    }

    $items = array();
    if (is_dir($folderPath)) {
        $handle = opendir($folderPath);
        while (false !== ($entry = readdir($handle))) {
            
            // Fájlnév ellenőrzése:
            if ($entry === '.' || $entry === '..') continue;
            if (substr($entry, -7) === '.kiskep') continue; // Kiskép fájlokat ne listázzuk

            // Windows-on a readdir() a rendszer encoding-jában adja vissza a fájlneveket
            // Ha már UTF-8, használjuk; ha nem, ISO-8859-2-ből konvertáljuk
            if (mb_check_encoding($entry, "UTF-8")) {
                $entryUtf8 = $entry;
            } else {
                // ISO-8859-2 (Latin-2) tartalmazza az összes magyar karaktert (á, é, í, ó, ú, ö, ü, ő, ű)
                $entryUtf8 = mb_convert_encoding($entry, "UTF-8", "ISO-8859-2");
            }

            $filePath = $folderPath . $entry;
            if (is_dir($filePath)) {
                // Mappa
                $items[] = array(
                    'name' => $entryUtf8,
                    'type' => 'folder',
                    'date' => date('Y-m-d H:i:s', filemtime($filePath)),
                    'thumbnail' => ''
                );
            } else {
                // Fájl - csak képeket listázunk
                $ext = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
                if (in_array($ext, array('jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'))) {
                    $thumbPath = $folderPath . $entry . '.kiskep';

                    // Thumbnail létrehozása ha még nincs
                    if (!file_exists($thumbPath)) {
                        createThumbnail($filePath, $thumbPath);
                    }

                    $items[] = array(
                        'name' => $entryUtf8,
                        'type' => 'file',
                        'date' => date('Y-m-d H:i:s', filemtime($filePath)),
                        'thumbnail' => $entryUtf8 . '.kiskep'
                    );
                }
            }
        }
        closedir($handle);
    }
    else {
      echo "Nincs ilyen mappa: $folderPath<br>";
    }
    
    // Rendezés: mappák előre, majd ABC-sorrend
    $folders = array();
    $files = array();
    foreach ($items as $item) {
        if ($item['type'] === 'folder') {
            $folders[] = $item;
        } else {
            $files[] = $item;
        }
    }
    
    // Rendezés név szerint
    usort($folders, function($a, $b) {
        return strcasecmp($a['name'], $b['name']);
    });
    usort($files, function($a, $b) {
        return strcasecmp($a['name'], $b['name']);
    });
    
    // Egyesítés: mappák előre, aztán fájlok
    $items = array_merge($folders, $files);
    
    // JSON kódolás:
    $json = json_encode($items);
    if ($json === false) {
        error_log("JSON encode failed: " . json_last_error_msg());
        return json_encode(array('error' => 'JSON encoding failed: ' . json_last_error_msg()));
    } else {
        return $json;
    }
}
