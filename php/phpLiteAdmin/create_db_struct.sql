CREATE TABLE `dixit_jatekosok` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `keszen_all` int(1) NOT NULL DEFAULT FALSE,
  `nev` varchar(100) NOT NULL,
  `szavazat` varchar(100) NOT NULL DEFAULT "",
  `lerakott_lap` varchar(100) DEFAULT NULL,
  `elso` int(1) DEFAULT NULL,
  `pont` int(10) DEFAULT NULL
);

CREATE TABLE `dixit_lapok` (
  `id` varchar(100) NOT NULL,
  `allapot` varchar(100) DEFAULT NULL
);

CREATE TABLE `dixit_paklik` (
  `id` varchar(100) NOT NULL,
  `leiras` varchar(100) NOT NULL,
  `lapok_szama` int(11) DEFAULT NULL
);

