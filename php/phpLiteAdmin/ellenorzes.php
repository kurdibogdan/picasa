<?php
// Kényszerítsük a hibák megjelenítését ebben a tiszta szkriptben
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h2>phpLiteAdmin Környezet Ellenőrzés</h2>";
echo "<ul>";

// 1. PHP Verzió ellenőrzése
$php_version = phpversion();
echo "<li><strong>PHP verzió:</strong> " . $php_version . "</li>";

// 2. MBSTRING kiterjesztés (Ha ez hiányzik, a phpLiteAdmin azonnal összeomlik!)
if (extension_loaded('mbstring')) {
    echo "<li style='color:green;'><strong>✓ mbstring kiterjesztés:</strong> Elérhető (OK)</li>";
} else {
    echo "<li style='color:red;'><strong>✗ mbstring kiterjesztés:</strong> HIÁNYZIK! Ez okozza az üres képernyőt.</li>";
}

// 3. SQLite3 támogatás
if (extension_loaded('sqlite3')) {
    echo "<li style='color:green;'><strong>✓ SQLite3 kiterjesztés:</strong> Elérhető (OK)</li>";
} else {
    echo "<li style='color:red;'><strong>✗ SQLite3 kiterjesztés:</strong> HIÁNYZIK!</li>";
}

// 4. PDO SQLite támogatás
if (extension_loaded('pdo_sqlite')) {
    echo "<li style='color:green;'><strong>✓ PDO SQLite kiterjesztés:</strong> Elérhető (OK)</li>";
} else {
    echo "<li style='color:red;'><strong>✗ PDO SQLite kiterjesztés:</strong> HIÁNYZIK!</li>";
}

// 5. Munkamenetek (Session) ellenőrzése
if (function_exists('session_start')) {
    echo "<li style='color:green;'><strong>✓ Session támogatás:</strong> Elérhető (OK)</li>";
} else {
    echo "<li style='color:red;'><strong>✗ Session támogatás:</strong> HIÁNYZIK vagy le van tiltva!</li>";
}

// 6. Memória limit teszt
echo "<li><strong>Memória limit (memory_limit):</strong> " . ini_get('memory_limit') . "</li>";

echo "</ul>";
?>