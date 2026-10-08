const Fajlkezelo = {
  
  uzenet_fogadasa: function(tavoli_id, uzenet) {
    console.log("Üzenet érkezett: " + uzenet.tipus);
    switch (uzenet.tipus) {
      case "mappa_megnyitasa":
        this.mappatartalom_elkuldese(tavoli_id, uzenet.utvonal);
        break;
      case "mappatartalom":
        this.mappatartalom_megjelenitese(tavoli_id, uzenet.utvonal, uzenet.fajlok);
        break;
      case "fajl_letoltese":
        console.log("Kliens kéri a fájlt: " + uzenet.utvonal);
        Fajlkezelo.fajltartalom_elkuldese(tavoli_id, uzenet.utvonal);
        break;
      case "fajltartalom":
        Fajlkezelo.fajltartalom_feldolgozasa(uzenet.tartalom);
        break;
      default:
        console.log("Ismeretlen bejövő üzenettípus: " + uzenet.tipus);
        break;
    }
  },
  
  mappa_megnyitasa: function(tavoli_id, utvonal) {
    let kapcsolat = Kapcsolatok.kapcsolat_keresese(tavoli_id);
    let csatorna = kapcsolat.csatorna;
    csatorna.send(JSON.stringify({
      tipus: "mappa_megnyitasa",
      utvonal: utvonal
    }));
  },
  
  mappatartalom_elkuldese: function(tavoli_id, utvonal) {
    let kapcsolat = Kapcsolatok.kapcsolat_keresese(tavoli_id);
    let csatorna = kapcsolat.csatorna;
    // Fájllista lekérése a helyi PHP-től és továbbküldése P2P-n
    $.get("php/fajlkezelo.php", {
      "parancs": "mappatartalom",
      "utvonal": encodeURIComponent(utvonal)
    },
    function(data) {
      console.log(data);
      csatorna.send(JSON.stringify({
        tipus: "mappatartalom",
        utvonal: (utvonal || ''),
        fajlok: JSON.parse(data)
      }));
    });
  },
  
  mappatartalom_megjelenitese: function(tavoli_id, utvonal, fajlok) {
    let t = "<div class='nagykeret'>";
    
    // Ha nem a gyökérben vagyunk, mutassunk "vissza" gombot
    if (utvonal) {
      let parentPath = utvonal.split('/').filter(Boolean);
      parentPath.pop();
      parentPath = parentPath.join('/');
      t += "<div class='keret'>"
         + " <div class='kiskep' onclick=\"Fajlkezelo.mappa_megnyitasa(" + tavoli_id + ", '" + parentPath + "')\">"
         + "  <span>&#128281;</span>"
         + " </div>"
         + " <div class='nev'>..</div>"
         + " <div class='datum'>&nbsp;</div>"
         + "</div>";
    }
    
    // Mappák kilistázása:
    for (let i = 0; i < fajlok.length; i++) {
      let item = fajlok[i];
      if (item.tipus == "mappa") {
        let folderPath = (utvonal ? utvonal + '/' : "") + item.nev;
        t += "<div class='keret'>"
           + " <div class='kiskep' onclick=\"Fajlkezelo.mappa_megnyitasa(" + tavoli_id + ", '" + folderPath + "')\">"
           + "  <span>&#128193;</span>"
           + " </div>"
           + " <div class='nev'>" + item.nev + "</div>"
           + " <div class='datum'>" + item.datum + "</div>"
           + "</div>";
      } else {
        t += "<div class='keret'>"
           + " <div class='kiskep' "
           + "      style=\"background-image: url('" + item.kiskep + "');\""  // "&#128247;
           + "      onclick=\"Fajlkezelo.fajl_letoltese("
           +          tavoli_id + ", "
           + "        '" + item.nev + (item.tipus ? "." + item.tipus : "") + "', "
           + "        '" + (utvonal || '') + "'"
           + "      );\">"
           + " </div>"
           + " <div class='nev'>" + item.nev + "</div>"
           + " <div class='datum'>" + item.datum + "</div>"
           + "</div>";
      }
    }
    t += "</div>";
    document.getElementById("file-list").innerHTML = t;
  },
  
  fajl_letoltese: function(tavoli_id, file, path) {
    let kapcsolat = Kapcsolatok.kapcsolat_keresese(tavoli_id);
    let csatorna = kapcsolat.csatorna;
    let fullPath = (path || "") + file;
    console.log("fajl_letoltese(): Full path: " + fullPath);
    csatorna.send(JSON.stringify({
      tipus: "fajl_letoltese",
      utvonal: fullPath
    }));
  },
  
  // Egy konkrét kép beolvasása a helyi PHP-től és küldése
  fajltartalom_elkuldese: function(tavoli_id, utvonal) {
    $.get("php/fajlkezelo.php", {
      "parancs": "fajltartalom",
      "utvonal": encodeURIComponent(utvonal)
    }, function(tartalom) {
      console.log(tartalom);
      let kapcsolat = Kapcsolatok.kapcsolat_keresese(tavoli_id);
      let csatorna = kapcsolat.csatorna;
      csatorna.send(JSON.stringify({
        tipus: "fajltartalom",
        tartalom: tartalom
      }));
    });
  },
  
  fajltartalom_feldolgozasa: function(fajltartalom){
    document.getElementById("kep_megjelenitese").innerHTML = "<img src='" + fajltartalom + "'>";
  }
  
};
