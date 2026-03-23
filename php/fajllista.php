<?php
    include("kiskepkeszito.php");
	$LOCALHOST = in_array($_SERVER['REMOTE_ADDR'], ['127.0.0.1', '::1']);
    $MEGOSZTASI_MAPPA = "../SharedPhotos";
	
	header('Content-Type: text/html; charset=utf-8');
	if(isset($_GET['mappa']))
	{
        // Normalizáljuk az útvonalat:
		$mappa = $_GET['mappa'];
        $mappa = str_replace('\\', '/', $mappa);
        $mappa = trim($mappa, '/') . '/';
        $darabok = explode('/', $mappa);
        foreach ($darabok as $darab) {
          if ($darab === "..") {
            $mappa = "";
          }
        }
		$mappa = $MEGOSZTASI_MAPPA."/".$mappa;
        
        // Karakterkódolás beállítása:
		if ($LOCALHOST == true) {
            $mappa = iconv("UTF-8", "ISO-8859-1//TRANSLIT", urldecode($mappa));
        }
		else {
            $mappa = urldecode($mappa);
		}
        
		if (!is_dir($mappa)) {
            echo "Nincs ilyen mappa: $mappa<br>-> Alap mappa beállítása.<br>";
            $mappa = $MEGOSZTASI_MAPPA;
		}
        
        // Mappák, fájlok kilistázása:
        $a = dir($mappa);
		$b = array();
		while(($fajl=$a->read()) !== false)
		{
			if ($fajl == "." or $fajl == "..") continue;
			if ($mappa == $MEGOSZTASI_MAPPA and $fajl == "..") continue;
            if (substr($fajl, -7) === '.kiskep') continue;
			
			$teljes_utvonal = $mappa."/".$fajl;
			
			$c = array();
			if ($fajl == ".." or !is_file($teljes_utvonal))
                $c['nev'] = pathinfo($fajl, PATHINFO_BASENAME);
			else
                $c['nev'] = pathinfo($fajl, PATHINFO_FILENAME);
			
			if ($LOCALHOST == true) {
                $c['nev'] = htmlentities(mb_convert_encoding($c['nev'], 'UTF-8', 'Windows-1252'), ENT_QUOTES, 'UTF-8');
			}
			if (is_file($teljes_utvonal)) {
				$c['tipus'] = pathinfo($fajl, PATHINFO_EXTENSION);
				$c['meret'] = filesize($teljes_utvonal);
			}
			else {
				$c['tipus'] = "mappa";
				$c['meret'] = "";
			}
			
			$c['datum'] = date('Y.m.d. H:i', filemtime($teljes_utvonal));
			array_push($b, $c);
            
            // Képekhez előnézeti kép készítése, ha még nincs:
            if (in_array($c['tipus'], array('jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'))) {
              $kiskep_utvonal = $teljes_utvonal.".kiskep";              
              if (!file_exists($kiskep_utvonal)) {
                  kiskep_keszitese($teljes_utvonal, $kiskep_utvonal);
              }
            }
		}
		
        // Betűrendbe rendezés buborékrendezéssel:
		for ($n=sizeof($b); $n>1; $n=$n-1){
		  for ($i=0; $i<$n-1; $i=$i+1){
		    if (strtolower($b[$i]['nev']) > strtolower($b[$i+1]['nev'])){
				$z = $b[$i];
				$b[$i] = $b[$i+1];
				$b[$i+1] = $z;
		    }
		  }
	    }
		
		echo json_encode($b);
		//print_r($b);
	}
	else
	{
		echo "Nincs beállítva mappanév vagy a mappa nem létezik!";
	}
?>