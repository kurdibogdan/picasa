<?php
    if (isset($KAPCSOLAT) == false) {
        $KAPCSOLAT = true;
        
        $LOCALHOST = in_array($_SERVER['REMOTE_ADDR'], ['127.0.0.1', '::1']);
        $MEGOSZTASI_MAPPA = "../SharedPhotos";
        
        function get($parameter){
            $ertek = "";
            if (isset($_GET[$parameter]) and $_GET[$parameter] != ""){
                $ertek = $_GET[$parameter];
            }
            return($ertek);
        }
        
        function post($parameter){
            $ertek = "";
            if (isset($_POST[$parameter]) and $_POST[$parameter] != ""){
                $ertek = $_POST[$parameter];
            }
            return($ertek);
        }
    
    }
?>