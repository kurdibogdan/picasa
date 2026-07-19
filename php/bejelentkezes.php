<?php
    include("kapcsolat.php");
    $kapcsolat->query("INSERT INTO kapcsolatok ('id') VALUES (NULL);");
    echo $kapcsolat->lastInsertId();
    $kapcsolat = null;
?>