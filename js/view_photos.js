const Uzenetfeldolgozo = {
  
  uzenet_fogadasa: function(tavoli_id, uzenet) {
    console.log("Üzenet érkezett: " + uzenet.tipus);
    switch (uzenet.tipus) {
      case "fajllista_lekerdezese":
        // displayFileList(csatorna, msg.files, msg.path || '');
        break;
      case "kepfajl_lekerdezese":
        // TODO: displayFileName(msg.filename);
        // displayImage(msg.image);
        break;
      case "fajl_lekerdezese":
        // console.log("Kliens kéri a fájlt: " + msg.path);
        // fetchAndSendFile(csatorna, msg.path);
        break;
      case "mappa_lekerdezese":
        this.mappatartalom_elkuldese(tavoli_id, uzenet.utvonal);
        // console.log("Kliens kéri a mappa tartalmát: " + msg.path);
        // await sendLocalFileList(csatorna, msg.path);
        break;
      case "mappatartalom":
        this.mappatartalom_megjelenitese(uzenet.utvonal, uzenet.fajlok);
        break;
      default:
        console.log("Ismeretlen bejövő üzenettípus: " + uzenet.tipus);
        break;
    }
  },
  
  mappa_lekerdezese: function(csatorna, utvonal) {
    console.log("Mappa lekérdezése: " + utvonal);
    csatorna.send(JSON.stringify({
      tipus: "mappa_lekerdezese",
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
  
  mappatartalom_megjelenitese: function(utvonal, fajlok) {
    let t = "<div class='nagykeret'>";
    
    // Ha nem a gyökérben vagyunk, mutassunk "vissza" gombot
    if (utvonal) {
      let parentPath = utvonal.split('/').filter(Boolean);
      parentPath.pop();
      parentPath = parentPath.join('/');
      t += "<div class='keret'>"
         + " <div class='kiskep' onclick=\"openFolder('" + parentPath + "')\">"
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
        let folderPath = utvonal ? utvonal + '/' + item.nev : item.nev;
        t += "<div class='keret'>"
           + " <div class='kiskep' onclick=\"openFolder('" + folderPath + "')\">"
           + "  <span>&#128193;</span>"
           + " </div>"
           + " <div class='nev'>" + item.nev + "</div>"
           + " <div class='datum'>" + item.datum + "</div>"
           + "</div>";
      } else {
        t += "<div class='keret'>"
           + " <div class='kiskep' "
           + "      style=\"background-image: url('" + item.kiskep + "');\""  // "&#128247;
           + "      onclick=\"getFile(" 
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
  }
  
};


async function processMessage(csatorna, msg){
  console.log("TODO: régi üzenetfogadó törlése");
  switch(msg.type) {
    case "file_list":
      displayFileList(csatorna, msg.files, msg.path || '');
      break;
    case "image_data":
      // TODO: displayFileName(msg.filename);
      displayImage(msg.image);
      break;
    case "get_file":
      console.log("Kliens kéri a fájlt: " + msg.path);
      fetchAndSendFile(csatorna, msg.path);
      break;
    case "get_folder":
      console.log("Kliens kéri a mappa tartalmát: " + msg.path);
      await sendLocalFileList(csatorna, msg.path);
      break;
    default:
      console.log("Ismeretlen bejövő üzenettípus: " + msg.type);
      break;
  }
}

function openFolder(csatorna, utvonal) {
  csatorna.send(JSON.stringify({
    tipus: "mappa_lekerdezese",
    utvonal: utvonal
  }));
}

function displayImage(base64Data) {
  document.getElementById("display-image").innerHTML = "<img src='" + base64Data + "'>";
}

function getFile(csatorna, file, path) {
  let fullPath = path ? path + '/' + file : file;
  csatorna.send(JSON.stringify({
    type: 'get_file',
    path: fullPath
  }));
}

// Egy konkrét kép beolvasása a helyi PHP-től és küldése
function fetchAndSendFile(csatorna, path) {
  $.get("php/fajlkezelo.php", {
    "action": "file",
    "path": encodeURIComponent(path)
  }, function(data) {
    csatorna.send(JSON.stringify({
      type: 'image_data',
      image: data
    }));
  });
}

// Fájllista lekérése a helyi PHP-től és továbbküldése P2P-n
async function sendLocalFileList(csatorna, utvonal) {
  $.get("php/fajlkezelo.php", {
    "action": "list",
    "path": encodeURIComponent(utvonal)
  }, 
  function(data) {
    console.log(data);
    csatorna.send(JSON.stringify({
      type: "file_list",
      path: (utvonal || ''),
      files: JSON.parse(data)
    }));
  });
}
