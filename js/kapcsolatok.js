var sajat_id = -1;

function bejelentkezes(callback) {
  $.get("php/bejelentkezes.php", function(data){
    sajat_id = data;
    if (typeof callback == "function"){
      callback();
    }
  });
}

// ----------------------------------------------------------- //
/* WebRTC Peer kapcsolódás sorrendje
   
   (A) kezdeményez kapcsolatot (B)-vel:

   1. PHP kilistázza az elérhető peereket.

   2. (A) -> kapcsolat_kezdemenyezese(peer_id_B)
      - készít egy "RTCPeerConnection"-t és beállítja az ICE kandidátust
      - készít egy "DataChannel"-t a kétirányú kommunikációhoz
      - készít egy "SDP Offer"-t és beállítja helyi leíróként (LocalDescription)
      - küld egy "Offer (SDP)"-t (B)-nek a PHP-n keresztül.
      
   3. (B) megkapja az üzenetet a "handleIncomingSignaling()" segítségével
      - készít egy "RTCPeerConnection" és beállítja az ICE kandidátust
      - elmenti a beérkező "Offer"-t távoli leíróként (RemoteDescription)
      - készít egy "SDP Answer"-t és beállítja helyi leíróként (LocalDescription)
      - küld választ (Answer (SDP)) (A)-nak a PHP-n keresztül.
   
   4. (A) megkapja a választ (Answer) a "handleIncomingSignaling()" segítségével
      - beállítja a választ (Answer) távoli leíróként (RemoteDescription)
   
   5. Mindkét peer kicseréli az ICE kandidátusait (a kapcsolat felépítése közben folyamatosan):
      - Amikor az ICE kandidátusokat felfedezik, mindkét peer elküldi azt a PHP szervernek.
      - Mindkét peer megkapja és hozzárendeli a másik (távoli) ICE kandidátust a kapcsolathoz.
      - Az ICE kandidátusokon keresztül a peerek megtalálják a legjobb hálózati útvonalat (STUN/TURN).
   
   6. Amint a megfelelő ICE kandidátusokat kicserélték, a média-útvonal felépült:
      - adatkapcsolat nyitva van mindkét oldalon (DataChannel)
      - a peerek tudnak küldeni / fogadni adatot
*/
// ----------------------------------------------------------- //

const Kapcsolatok = {
  KAPCSOLATOK_FRISSITESI_PERIODUSA: 5000, // ms
  UZENETEK_FRISSITESI_PERIODUSA: 2000, // ms
  elozo_kapcsolatok: "",
  letrejott_kapcsolatok: [],  // Amikkel már összekapcsolódott.
  selectedPeer: { left: null, right: null }, // melyik peer van kiválasztva melyik panelen
  
  kapcsolatok_periodikus_frissitese: function() {
    // Kilistázza az elérhető kapcsolatokat (de még nem kapcsolta össze őket).
    // A listát periodikusan frissíti.
    $.get("php/kapcsolatok_frissitese.php", {sajat_id: sajat_id}, function(data) {
      if (data != Kapcsolatok.elozo_kapcsolatok) {
        if (data.length > 0) console.log(data);  // DEBUG
         
        // elérhető kapcsolatok kilistázása (kivéve a saját ID-t):
        Kapcsolatok.elozo_kapcsolatok = data;
        var peers = jQuery.parseJSON(data);

        // Render two peer lists (left and right)
        Kapcsolatok.renderPeerLists(peers);
        
        // inaktív kapcsolatok törlése:
        for (let i=Kapcsolatok.letrejott_kapcsolatok.length-1; i>=0; i--) {
          let letrejott_kapcsolat = Kapcsolatok.letrejott_kapcsolatok[i];
          let kapcsolat_aktiv = false;
          for (let peer of peers) {
            if (peer.id == letrejott_kapcsolat.id) {
              kapcsolat_aktiv = true;
              break;
            }
          }
          if (kapcsolat_aktiv == false) {
            Kapcsolatok.letrejott_kapcsolatok.splice(i, 1);
          }
        }
      }
      setTimeout(Kapcsolatok.kapcsolatok_periodikus_frissitese, Kapcsolatok.KAPCSOLATOK_FRISSITESI_PERIODUSA);
    });
  },
  
  renderPeerLists: function(peers) {
    const leftContainer = document.getElementById('peer-list-container-left');
    const rightContainer = document.getElementById('peer-list-container-right');
    if (!leftContainer || !rightContainer) return; // még nincs DOM
    leftContainer.innerHTML = '';
    rightContainer.innerHTML = '';

    peers.forEach(function(peerObj){
      function makeButton(side) {
        const btn = document.createElement('div');
        btn.className = 'peer-button';
        // státusz kör
        const status = document.createElement('span');
        status.className = 'status-circle';

        // determine state
        let state = 'available';
        if (peerObj.id == sajat_id) state = 'own';
        else {
          let kapcsolat = Kapcsolatok.kapcsolat_keresese(peerObj.id);
          if (!kapcsolat) state = 'available';
          else if (kapcsolat.csatorna && kapcsolat.csatorna.readyState === 'open') state = 'connected';
          else state = (kapcsolat.state === 'connecting' || kapcsolat.pc && kapcsolat.pc.connectionState === 'connecting') ? 'connecting' : 'available';
        }

        status.classList.add('status-' + state);

        // only show ID text
        const idSpan = document.createElement('span');
        idSpan.className = 'peer-id';
        idSpan.innerText = peerObj.id;

        btn.appendChild(status);
        btn.appendChild(idSpan);

        if (Kapcsolatok.selectedPeer[side] == peerObj.id) btn.classList.add('selected');
        btn.onclick = function() {
          Kapcsolatok.selectPeer(side, peerObj.id);
        };
        return btn;
      }

      leftContainer.appendChild(makeButton('left'));
      rightContainer.appendChild(makeButton('right'));
    });
  },
  
  selectPeer: function(side, id) {
    Kapcsolatok.selectedPeer[side] = id;
    // frissítjük a megjelenítést
    try { Kapcsolatok.renderPeerLists(jQuery.parseJSON(Kapcsolatok.elozo_kapcsolatok)); } catch(e){}

    // Clear current pane file list while we request new one
    const containerId = (side === 'left') ? 'file-list-left' : 'file-list-right';
    document.getElementById(containerId).innerHTML = '<div class="keret">Kérés küldése...</div>';

    if (id == sajat_id) {
      // saját fájlok megjelenítése azon a panelen
      Fajlkezelo.mappatartalom_lekerdez_local('', side);
    } else {
      // ha van már kapcsolat és nyitott a csatorna, kérjük le rögtön a listát
      let kapcsolat = Kapcsolatok.kapcsolat_keresese(id);
      if (kapcsolat && kapcsolat.csatorna && kapcsolat.csatorna.readyState === 'open') {
        Fajlkezelo.mappa_megnyitasa(id, '');
      } else {
        // ha nincs kapcsolat, kezdeményezzük. onopen fogja kérni a listát.
        // create or reuse a kapcsolat object and mark as connecting
        if (!kapcsolat) {
          kapcsolat = { id: id, state: 'connecting' };
          Kapcsolatok.letrejott_kapcsolatok.push(kapcsolat);
          Kapcsolatok.peer_beallitasa(kapcsolat);
          Kapcsolatok.csatorna_keszitese(kapcsolat);
          Kapcsolatok.osszekapcsolas(kapcsolat);
        } else {
          kapcsolat.state = 'connecting';
          // if pc exists, try to create offer again
          if (kapcsolat.pc && kapcsolat.pc.connectionState !== 'connected') {
            Kapcsolatok.osszekapcsolas(kapcsolat);
          }
        }
        // re-render to show connecting state
        try { Kapcsolatok.renderPeerLists(jQuery.parseJSON(Kapcsolatok.elozo_kapcsolatok)); } catch(e){}
      }
    }
  },
  
  kapcsolat_keresese: function(tavoli_id) {
    for (let letrejott_kapcsolat of Kapcsolatok.letrejott_kapcsolatok) {
      if (tavoli_id == letrejott_kapcsolat.id) {
        return letrejott_kapcsolat;
      }
    }
  },
  
  kapcsolat_kezdemenyezese: async function(tavoli_id) {
    // Ha már létrejött a kapcsolat, akkor nincs semmi teendő:
    for (let letrejott_kapcsolat of Kapcsolatok.letrejott_kapcsolatok) {
      if (letrejott_kapcsolat.id == tavoli_id) {
        return (letrejott_kapcsolat);
      }
    }
    // Új kapcsolat felvétele:
    console.log("Kapcsolódás kezdeményezése: " + tavoli_id);
    var kapcsolat = {};
    kapcsolat.id = tavoli_id;
    kapcsolat.state = 'connecting';
    Kapcsolatok.peer_beallitasa(kapcsolat);
    Kapcsolatok.csatorna_keszitese(kapcsolat);
    Kapcsolatok.osszekapcsolas(kapcsolat);
    
    // TODO: legyen visszajelzés arról, hogy sikerült-e összekapcsolni, és csak akkor vegye fel a létrejött kapcsolatokhoz, ha igen.
    Kapcsolatok.letrejott_kapcsolatok.push(kapcsolat);
    // update UI
    try { Kapcsolatok.renderPeerLists(jQuery.parseJSON(Kapcsolatok.elozo_kapcsolatok)); } catch(e){}
    return(kapcsolat);
  },
  
  kapcsolat_fogadasa: async function(tavoli_id) {
    console.log("Kapcsolat fogadása: " + tavoli_id);
    
    // Meglévő kapcsolat újrafelhasználása:
    for (let letrejott_kapcsolat of Kapcsolatok.letrejott_kapcsolatok) {
      if (letrejott_kapcsolat.id == tavoli_id) {
        console.log("Kapcsolat már létezik, újrafelhasználás");
        return(letrejott_kapcsolat);
      }
    }
    
    // Ha még nem volt, akkor új kapcsolat létrehozása:
    var kapcsolat = {};
    kapcsolat.id = tavoli_id;
    kapcsolat.state = 'connecting';
    Kapcsolatok.peer_beallitasa(kapcsolat);
    // Nem kell csatorna_keszitese(), mert a csatornát megkapja 'ondatachannel'-en keresztül.
    // Nem kell osszekapcsolas(), mert már a kezdeményező fél megcsinálta.
    
    Kapcsolatok.letrejott_kapcsolatok.push(kapcsolat);
    // update UI
    try { Kapcsolatok.renderPeerLists(jQuery.parseJSON(Kapcsolatok.elozo_kapcsolatok)); } catch(e){}
    return(kapcsolat);
  },
  
  peer_beallitasa: function(kapcsolat){
    const RTC_BEALLITASOK = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
      ]
    };
    kapcsolat.pc = new RTCPeerConnection(RTC_BEALLITASOK);
    
    kapcsolat.pc.oniceconnectionstatechange = () => {
      console.log("🔵 ICE kapcsolat állapota:", kapcsolat.pc.iceConnectionState);
      // update state/UI
      if (kapcsolat.pc.iceConnectionState === 'connected' || kapcsolat.pc.iceConnectionState === 'completed') {
        kapcsolat.state = 'connected';
      } else if (kapcsolat.pc.iceConnectionState === 'checking' || kapcsolat.pc.iceConnectionState === 'new') {
        kapcsolat.state = 'connecting';
      }
      try { Kapcsolatok.renderPeerLists(jQuery.parseJSON(Kapcsolatok.elozo_kapcsolatok)); } catch(e){}
    };
    
    kapcsolat.pc.onconnectionstatechange = () => {
      console.log("🟢 kapcsolat állapota:", kapcsolat.pc.connectionState);
      if (kapcsolat.pc.connectionState === 'connected') kapcsolat.state = 'connected';
      else if (kapcsolat.pc.connectionState === 'connecting') kapcsolat.state = 'connecting';
      else if (kapcsolat.pc.connectionState === 'disconnected' || kapcsolat.pc.connectionState === 'failed' || kapcsolat.pc.connectionState === 'closed') kapcsolat.state = 'available';
      try { Kapcsolatok.renderPeerLists(jQuery.parseJSON(Kapcsolatok.elozo_kapcsolatok)); } catch(e){}
    };
    
    // 1. Bejövő ICE Candidate kezelése
    kapcsolat.pc.onicecandidate = (event) => {
      console.log("ICE Candidate");
      if (event.candidate && kapcsolat.id) {
        console.log("ICE candidate küldése...");
        $.post("php/uzenetek_kuldese.php", JSON.stringify({
          cimzett_id: kapcsolat.id,
          kuldo_id: sajat_id,
          torzs: {type: "candidate", candidate: event.candidate}
        }), function(data){
          if (data != "") console.log(data);
        });
      }
    };
    
    // 2. Bejövő csatorna kezelése:
    kapcsolat.pc.ondatachannel = function(event) {
      if (!kapcsolat.csatorna) {
        console.log("DataChannel érkezett a távoli féltől!");
        kapcsolat.csatorna = event.channel;
        Kapcsolatok.csatorna_beallitasa(kapcsolat);
      }
    };
  
  },
  
  csatorna_keszitese: function(kapcsolat) {
    kapcsolat.csatorna = kapcsolat.pc.createDataChannel("photos");
    kapcsolat.csatorna.binaryType = "arraybuffer";
    kapcsolat.csatorna.bufferedAmountLowThreshold = 128 * 1024;
    Kapcsolatok.csatorna_beallitasa(kapcsolat, function(){
      // Ha a csatorna megnyílt és ez a peer jelenleg kiválasztott valamelyik panelen, akkor kérdezzük le a gyökérmappát
      if (Kapcsolatok.selectedPeer.left == kapcsolat.id || Kapcsolatok.selectedPeer.right == kapcsolat.id) {
        Fajlkezelo.mappa_megnyitasa(kapcsolat.id, "");
      }
    });
  },
  
  csatorna_beallitasa: function(kapcsolat, callback) {
    kapcsolat.csatorna.onopen = function() {
      console.log("P2P csatorna megnyílt! Állapot:", kapcsolat.csatorna.readyState);
      kapcsolat.state = 'connected';
      try { Kapcsolatok.renderPeerLists(jQuery.parseJSON(Kapcsolatok.elozo_kapcsolatok)); } catch(e){}
      if (typeof callback == "function") callback();

      // Ha ez a peer ki van választva valamelyik panelen, kérjük le automatikusan a listát
      try {
        if (Kapcsolatok.selectedPeer.left == kapcsolat.id || Kapcsolatok.selectedPeer.right == kapcsolat.id) {
          Fajlkezelo.mappa_megnyitasa(kapcsolat.id, "");
        }
      } catch (e) {
        console.warn("Hiba a onopen utáni mappalista kérésnél:", e);
      }
    };
    kapcsolat.csatorna.onclose = () => {
      console.log("P2P csatorna bezárult.");
      kapcsolat.state = 'available';
      try { Kapcsolatok.renderPeerLists(jQuery.parseJSON(Kapcsolatok.elozo_kapcsolatok)); } catch(e){}
    };
    kapcsolat.csatorna.onerror = (err) => console.error("DataChannel hiba:", err);
    kapcsolat.csatorna.onmessage = async function(event) {
      if (typeof event.data === "string") {
        let uzenet = null;
        try {
          uzenet = JSON.parse(event.data);
        }
        catch (e) {
          console.warn("Nem JSON üzenet a DataChannelen:", event.data);
          return;
        }

        if (uzenet.tipus === "fajltartalom_meta") {
          Fajlkezelo.binaris_fajl_kezdese(kapcsolat.id, uzenet);
          return;
        }
        if (uzenet.tipus === "fajltartalom_vege") {
          Fajlkezelo.fajltartalom_vege_feldolgozasa(kapcsolat.id);
          return;
        }

        if (uzenet.tipus === "fajltartalom") {
          // képtartalom érkezett szövegként
          Fajlkezelo.fajltartalom_feldolgozasa(uzenet.tartalom, kapcsolat.id);
          return;
        }

        // mappa tartalom esetén a remote megjelenítőt használjuk
        if (uzenet.tipus === 'mappatartalom') {
          Fajlkezelo.mappatartalom_megjelenitese_remote(kapcsolat.id, uzenet.utvonal, uzenet.fajlok);
          return;
        }

        Fajlkezelo.uzenet_fogadasa(kapcsolat.id, uzenet);
        return;
      }

      const buffer = event.data instanceof Blob ? await event.data.arrayBuffer() : event.data;
      const chunk = new Uint8Array(buffer);
      Fajlkezelo.fajltartalom_binaris_feldolgozasa(kapcsolat.id, chunk);
    };
  },
  
  osszekapcsolas: async function(kapcsolat) {
    try {
      var offer = await kapcsolat.pc.createOffer();
      await kapcsolat.pc.setLocalDescription(offer);
      
      $.post("php/uzenetek_kuldese.php", JSON.stringify({
        cimzett_id: kapcsolat.id,
        kuldo_id: sajat_id,
        torzs: {type: "offer", sdp: offer}
        }), function(data){
          if (data != "") console.log(data);
      });
      
    }
    catch (e) {
      console.error("Hiba az offer létrehozásakor:", e);
    }
  },
  
  uzenetek_periodikus_olvasasa: function() {
    $.get("php/uzenetek_fogadasa.php", {sajat_id: sajat_id}, function(data){
      if (data.length > 0 && data != "[]") console.log(data);
      var uzenetek = jQuery.parseJSON(data);
      uzenetek.forEach(function(uzenet){
        console.log("Új üzenet érkezett innen:", uzenet.kuldo_id);
        handleIncomingSignaling(uzenet.kuldo_id, jQuery.parseJSON(uzenet.torzs));  // webrtc.js
      });
      setTimeout(function(){
          Kapcsolatok.uzenetek_periodikus_olvasasa(sajat_id);
        }, 
        Kapcsolatok.UZENETEK_FRISSITESI_PERIODUSA);
    });
  }

};
