<?php
  ini_set('display_errors', 1);
  ini_set('display_startup_errors', 1);
  error_reporting(E_ALL);

  if (isset($KAPCSOLAT) == false) {
      $KAPCSOLAT = true;
      
      $LOCALHOST = in_array($_SERVER['REMOTE_ADDR'], ['127.0.0.1', '::1']);
      $MEGOSZTASI_MAPPA = "../SharedPhotos";
      
      try {
          $kapcsolat = new PDO("sqlite:phpLiteAdmin/adatbazis.db");
          $kapcsolat->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
      }
      catch (PDOException $e) {
          echo "HIBA: ".$e->getMessage();
      }
      
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