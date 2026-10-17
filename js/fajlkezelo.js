const Fajlkezelo = {
  binaris_fajlok: {},

  uzenet_fogadasa: function(tavoli_id, uzenet) {
    console.log("Üzenet érkezett: " + uzenet.tipus);
    switch (uzenet.tipus) {
      case "mappa_megnyitasa":
        this.mappatartalom_elkuldese(tavoli_id, uzenet.utvonal);
        break;
      case "mappatartalom":
        // Távoli peer küldte a mappalistát: jelenítsük meg azon a panelen, ahol az adott peer ki van választva
        this.mappatartalom_megjelenitese_remote(tavoli_id, uzenet.utvonal, uzenet.fajlok);
        break;
      case "fajl_letoltese":
        console.log("Kliens kéri a fájlt: " + uzenet.utvonal);
        Fajlkezelo.fajltartalom_elkuldese(tavoli_id, uzenet.utvonal);
        break;
      case "fajltartalom_meta":
        this.binaris_fajl_kezdese(tavoli_id, uzenet);
        break;
      case "fajltartalom_vege":
        this.fajltartalom_vege_feldolgozasa(tavoli_id);
        break;
      case "fajltartalom":
        Fajlkezelo.fajltartalom_feldolgozasa(uzenet.tartalom);
        break;
      default:
        console.log("Ismeretlen bejövő üzenettípus: " + uzenet.tipus);
        break;
    }
  },

  binaris_fajl_kezdese: function(tavoli_id, meta) {
    this.binaris_fajlok[tavoli_id] = {
      chunks: [],
      filename: meta.nev || "fajl.bin",
      meret: meta.meret || 0
    };
  },

  fajltartalom_binaris_feldolgozasa: function(tavoli_id, chunk) {
    if (!this.binaris_fajlok[tavoli_id]) {
      this.binaris_fajlok[tavoli_id] = {
        chunks: [],
        filename: "fajl.bin",
        meret: 0
      };
    }
    this.binaris_fajlok[tavoli_id].chunks.push(chunk);
  },

  fajltartalom_vege_feldolgozasa: function(tavoli_id) {
    const allapot = this.binaris_fajlok[tavoli_id];
    if (!allapot) {
      return;
    }

    const blob = new Blob(allapot.chunks, { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = allapot.filename || "fajl.bin";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    delete this.binaris_fajlok[tavoli_id];
  },

  // Kérést küldünk a távoli peernek, hogy nyissa meg az utat
  mappa_megnyitasa: function(tavoli_id, utvonal) {
    let kapcsolat = Kapcsolatok.kapcsolat_keresese(tavoli_id);
    if (!kapcsolat || !kapcsolat.csatorna) {
      console.warn("A mappa megnyitásához nincs nyitott kapcsolat.");
      return;
    }
    let csatorna = kapcsolat.csatorna;
    if (csatorna.readyState !== "open") {
      console.warn("A DataChannel még nem nyitott meg a mappa megnyitásához.");
      return;
    }
    csatorna.send(JSON.stringify({
      tipus: "mappa_megnyitasa",
      utvonal: utvonal
    }));
  },

  // Válasz a távoli peer mappa_megnyitasa kéréseire: lekérjük a mappatartalmat a helyi PHP-ből és elküldjuk
  mappatartalom_elkuldese: function(tavoli_id, utvonal) {
    let kapcsolat = Kapcsolatok.kapcsolat_keresese(tavoli_id);
    let csatorna = kapcsolat && kapcsolat.csatorna;
    if (!csatorna || csatorna.readyState !== 'open') {
      console.warn("Nem lehet mappatartalmat küldeni: DataChannel zárt vagy nem található.");
      return;
    }

    $.get("php/fajlkezelo.php", {
      "parancs": "mappatartalom",
      "utvonal": encodeURIComponent(utvonal)
    }, function(data) {
      try {
        let fajlok = JSON.parse(data);
        csatorna.send(JSON.stringify({
          tipus: "mappatartalom",
          utvonal: utvonal,
          fajlok: fajlok
        }));
      }
      catch (e) {
        console.error("Hiba a mappatartalom lekérésekor:", e);
        csatorna.send(JSON.stringify({ tipus: "mappatartalom_hiba", uzenet: e.message }));
      }
    }).fail(function(jqxhr, status, err) {
      console.error("Hiba a mappatartalom lekérésekor:", status, err);
      csatorna.send(JSON.stringify({ tipus: "mappatartalom_hiba", uzenet: status + " " + err }));
    });
  },
  
  // Ha a helyi fájlokat szeretnénk lekérdezni és megjeleníteni egy adott panelen
  mappatartalom_lekerdez_local: function(utvonal, side) {
    $.get("php/fajlkezelo.php", {
      "parancs": "mappatartalom",
      "utvonal": encodeURIComponent(utvonal)
    }, function(data) {
      let fajlok = JSON.parse(data);
      Fajlkezelo.mappatartalom_megjelenitese_local(side, (utvonal || ''), fajlok);
    });
  },

  // Helyi megjelenítés (közvetlen letöltés a PHP-ról)
  mappatartalom_megjelenitese_local: function(side, utvonal, fajlok) {
    let containerId = (side === 'left') ? 'file-list-left' : 'file-list-right';
    let imgContainerId = (side === 'left') ? 'kep_megjelenitese-left' : 'kep_megjelenitese-right';

    let t = "<div class='nagykeret'>";
    
    // Ha nem a gyökérben vagyunk, mutassunk "vissza" gombot
    if (utvonal) {
      let parentPath = utvonal.split('/').filter(Boolean);
      parentPath.pop();
      parentPath = parentPath.join('/');
      t += "<div class='keret'>"
         + " <div class='kiskep' onclick=\"Fajlkezelo.mappatartalom_lekerdez_local('" + parentPath + "','" + side + "')\">"
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
           + " <div class='kiskep' onclick=\"Fajlkezelo.mappatartalom_lekerdez_local('" + folderPath + "','" + side + "')\">"
           + "  <span>&#128193;</span>"
           + " </div>"
           + " <div class='nev'>" + item.nev + "</div>"
           + " <div class='datum'>" + item.datum + "</div>"
           + "</div>";
      }
      // Fájlok kilistázása:
      else {
        let downloadUrl = "php/fajlkezelo.php?parancs=fajltartalom&utvonal=" + encodeURIComponent((utvonal ? utvonal + '/' : '') + item.nev + (item.tipus ? '.' + item.tipus : ''));
        t += "<div class='keret'>"
           + " <div class='kiskep' "
           + "      style=\"background-image: url('" + item.kiskep + "');\""  // "&#128247;
           + "      onclick=\"window.open('" + downloadUrl + "','_blank')\">"
           + " </div>"
           + " <div class='nev'>" + item.nev + "</div>"
           + " <div class='datum'>" + item.datum + "</div>"
           + "</div>";
      }
    }
    t += "</div>";
    document.getElementById(containerId).innerHTML = t;
    document.getElementById(imgContainerId).innerHTML = "";
  },

  // Távoli peer fájljainak megjelenítése: használjuk a meglévő DataChannel alapú műveleteket
  mappatartalom_megjelenitese_remote: function(tavoli_id, utvonal, fajlok) {
    let side = null;
    if (typeof Kapcsolatok !== 'undefined' && Kapcsolatok.selectedPeer) {
      if (Kapcsolatok.selectedPeer.left === tavoli_id) {
        side = 'left';
      }
      else if (Kapcsolatok.selectedPeer.right === tavoli_id) {
        side = 'right';
      }
    }
    if (!side) side = 'right';

    let containerId = (side === 'left') ? 'file-list-left' : 'file-list-right';
    let imgContainerId = (side === 'left') ? 'kep_megjelenitese-left' : 'kep_megjelenitese-right';

    let t = "<div class='nagykeret'>";

    if (utvonal) {
      let parentPath = utvonal.split('/').filter(Boolean);
      parentPath.pop();
      parentPath = parentPath.join('/');
      t += "<div class='keret'>"
         + " <div class='kiskep' onclick=\"Fajlkezelo.mappa_megnyitasa('" + tavoli_id + "', '" + parentPath + "')\">"
         + "  <span>&#128281;</span>"
         + " </div>"
         + " <div class='nev'>..</div>"
         + " <div class='datum'>&nbsp;</div>"
         + "</div>";
    }

    for (let i = 0; i < fajlok.length; i++) {
      let item = fajlok[i];
      if (item.tipus == "mappa") {
        let folderPath = (utvonal ? utvonal + '/' : "") + item.nev;
        t += "<div class='keret'>"
           + " <div class='kiskep' onclick=\"Fajlkezelo.mappa_megnyitasa('" + tavoli_id + "', '" + folderPath + "')\">"
           + "  <span>&#128193;</span>"
           + " </div>"
           + " <div class='nev'>" + item.nev + "</div>"
           + " <div class='datum'>" + item.datum + "</div>"
           + "</div>";
      }
      else {
        t += "<div class='keret'>"
           + " <div class='kiskep' style=\"background-image: url('" + item.kiskep + "');\" onclick=\"Fajlkezelo.fajl_letoltese('" + tavoli_id + "', '" + item.nev + (item.tipus ? '.' + item.tipus : '') + "', '" + (utvonal || '') + "')\">"
           + " </div>"
           + " <div class='nev'>" + item.nev + "</div>"
           + " <div class='datum'>" + item.datum + "</div>"
           + "</div>";
      }
    }
    t += "</div>";
    document.getElementById(containerId).innerHTML = t;
    document.getElementById(imgContainerId).innerHTML = "";
  },
  
  fajl_letoltese: function(tavoli_id, fajl, mappa) {
    let kapcsolat = Kapcsolatok.kapcsolat_keresese(tavoli_id);
    if (!kapcsolat || !kapcsolat.csatorna) {
      console.warn("A fájl letöltéséhez nincs nyitott kapcsolat.");
      return;
    }
    let csatorna = kapcsolat.csatorna;
    let utvonal = (mappa ? mappa + "/" : "") + fajl;
    console.log("fajl_letoltese: " + utvonal);
    csatorna.send(JSON.stringify({
      tipus: "fajl_letoltese",
      utvonal: utvonal
    }));
  },
  
  // Egy konkrét kép beolvasása a helyi PHP-től és küldése
  fajltartalom_elkuldese: async function(tavoli_id, utvonal) {
    let kapcsolat = Kapcsolatok.kapcsolat_keresese(tavoli_id);
    let csatorna = kapcsolat && kapcsolat.csatorna;
    if (!csatorna || csatorna.readyState !== "open") {
      console.warn("A fájl küldéséhez a DataChannel még nem nyitott meg.");
      return;
    }

    const fajl_nev = decodeURIComponent((utvonal.split('/').pop() || "fajl.bin"));
    const fajl_url = "php/fajlkezelo.php?parancs=fajltartalom&utvonal=" + encodeURIComponent(utvonal);

    try {
      const response = await fetch(fajl_url);
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      if (!response.body) {
        throw new Error("A böngésző nem támogatja a streamelést.");
      }

      csatorna.send(JSON.stringify({
        tipus: "fajltartalom_meta",
        nev: fajl_nev,
        meret: response.headers.get("Content-Length") || 0
      }));

      const reader = response.body.getReader();
      const lowThreshold = csatorna.bufferedAmountLowThreshold || 128 * 1024;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        if (csatorna.bufferedAmount > lowThreshold) {
          await new Promise((resolve) => {
            const onLow = () => {
              csatorna.removeEventListener('bufferedamountlow', onLow);
              resolve();
            };
            csatorna.addEventListener('bufferedamountlow', onLow);
          });
        }

        csatorna.send(value);
      }

      csatorna.send(JSON.stringify({
        tipus: "fajltartalom_vege"
      }));
    }
    catch (error) {
      console.error("Fájl küldés hiba:", error);
      csatorna.send(JSON.stringify({
        tipus: "fajltartalom_hiba",
        uzenet: error.message
      }));
    }
  },
  
  fajltartalom_feldolgozasa: function(fajltartalom){
    let side = null;
    if (typeof Kapcsolatok !== 'undefined' && Kapcsolatok.selectedPeer) {
      if (Kapcsolatok.selectedPeer.left && Kapcsolatok.selectedPeer.left != sajat_id) side = (Kapcsolatok.selectedPeer.left == sajat_id ? 'left' : null);
    }
    if (!side) side = 'right';
    let imgContainerId = (side === 'left') ? 'kep_megjelenitese-left' : 'kep_megjelenitese-right';
    document.getElementById(imgContainerId).innerHTML = "<img src='" + fajltartalom + "'>";

    // legacy single-pane support
    try {
      var legacy = document.getElementById('kep_megjelenitese');
      if (legacy) legacy.innerHTML = "<img src='" + fajltartalom + "'>";
    } catch(e) {}
  }
  
};
