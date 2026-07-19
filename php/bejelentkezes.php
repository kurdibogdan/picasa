<?php
  include("kapcsolat.php");

  if ($LOCALHOST === true) {
    // Ha helyileg fut, akkor a távoli szerveren regisztrálja be magát a peer.
    // PHP-val hidaljuk át a "same-origin request" hibát.
    echo file_get_contents("https://kurdi.eu/bogdan/picasa/php/bejelentkezes.php");
  }
  else {
    // Ha szerveren fut, akkor a saját adatbázisát használja a kapcsolatok nyilvántartására.
    $kapcsolat->query("INSERT INTO kapcsolatok ('id') VALUES (NULL);");
    echo $kapcsolat->lastInsertId();
  }
  $kapcsolat = null;
?>