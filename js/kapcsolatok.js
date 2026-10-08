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
  
  kapcsolatok_periodikus_frissitese: function() {
    // Kilistázza az elérhető kapcsolatokat (de még nem kapcsolta össze őket).
    // A listát periodikusan frissíti.
    $.get("php/kapcsolatok_frissitese.php", {sajat_id: sajat_id}, function(data) {
      if (data != Kapcsolatok.elozo_kapcsolatok) {
        if (data.length > 0) console.log(data);  // DEBUG
         
        // elérhető kapcsolatok kilistázása (kivéve a saját ID-t):
        Kapcsolatok.elozo_kapcsolatok = data;
        var peers = jQuery.parseJSON(data);
        const container = document.getElementById('peer-list-container');
        container.innerHTML = '';
        peers.forEach(function(peerObj){
          // Saját ID:
          if (peerObj.id == sajat_id) {
            const div = document.createElement("div");
            div.className = "peer-item";
            div.innerText = "Saját ID: " + peerObj.id;
            container.appendChild(div);
          }
          else {
            let kapcsolodva = !! Kapcsolatok.kapcsolat_keresese(peerObj.id);
            if (kapcsolodva == true) {
              // Ha már összekapcsolódott, akkor csak megjelenítjük a listában, de nem kattintható:
              const div = document.createElement("div");
              div.innerText = "Csatlakozva: " + peerObj.id;              
              container.appendChild(div);
            }
            else {
              // Kapcsolódás kattintásra:
              const div = document.createElement("div");
              div.className = "peer-item";
              div.innerText = "Csatlakozás: " + peerObj.id;
              div.onclick = function(){Kapcsolatok.kapcsolat_kezdemenyezese(peerObj.id);}; // webrtc.js
              container.appendChild(div);
            }
          }
        });
        
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
    Kapcsolatok.peer_beallitasa(kapcsolat);
    Kapcsolatok.csatorna_beallitasa(kapcsolat);
    Kapcsolatok.osszekapcsolas(kapcsolat);
    
    // TODO: legyen visszajelzés arról, hogy sikerült-e összekapcsolni, és csak akkor vegye fel a létrejött kapcsolatokhoz, ha igen.
    Kapcsolatok.letrejott_kapcsolatok.push(kapcsolat);
    return(kapcsolat);
  },
  
  kapcsolat_fogadasa: async function(tavoli_id) {
    console.log("Kapcsolat fogadása: " + tavoli_id);
    
    // Meglévő kapcsolat újrafelhasználása:
    for (let letrejott_kapcsolat of Kapcsolatok.letrejott_kapcsolatok) {
      if (letrejott_kapcsolat.id == tavoli_id) {
        console.log("Kapcsolat már létezik, újrafelhasználás");
        return(letrejott_kapcsolat);  // Return existing connection
      }
    }
    
    // Ha még nem volt, akkor új kapcsolat létrehozása:
    var kapcsolat = {};
    kapcsolat.id = tavoli_id;
    Kapcsolatok.peer_beallitasa(kapcsolat);
    // Nem kell csatorna_beallitasa(), mert a csatornát megkapja 'ondatachannel'-en keresztül.
    // Nem kell osszekapcsolas(), mert már a kezdeményező fél megcsinálta.
    
    Kapcsolatok.letrejott_kapcsolatok.push(kapcsolat);
    return(kapcsolat);
  },
  
  peer_beallitasa: function(kapcsolat){
  // bejovo_kapcsolat_felvetele:
    const RTC_BEALLITASOK = {iceServers: [{ urls: "stun:stun.l.google.com:19302" }]};
    kapcsolat.pc = new RTCPeerConnection(RTC_BEALLITASOK); //  var PC = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
    
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
          console.log(data);
        });
      }
    };
    
    // 2. Bejövő csatorna kezelése:
    // TODO: Duplakódolás eltüntetése a csatorna_beallitasa()-val.
    kapcsolat.pc.ondatachannel = function(event) {
      console.log("DataChannel érkezett a távoli féltől!");      
      kapcsolat.csatorna = event.channel;
      kapcsolat.csatorna.onopen = function() {
        console.log("P2P csatorna megnyílt! Állapot:", kapcsolat.csatorna.readyState);
        console.log("Csatorna kész az üzenetekre.");
      };
      
      kapcsolat.csatorna.onclose = () => console.log("P2P csatorna bezárult.");
      kapcsolat.csatorna.onerror = (err) => console.error("DataChannel hiba:", err);
      kapcsolat.csatorna.onmessage = async function(event) {
        var uzenet = JSON.parse(event.data);
        console.log("Üzenet érkezett tőle: " + kapcsolat.id);
        Fajlkezelo.uzenet_fogadasa(kapcsolat.id, uzenet);
      };
    };
  
  },
  
  csatorna_beallitasa: function(kapcsolat) {
    kapcsolat.csatorna = kapcsolat.pc.createDataChannel("photos");
    kapcsolat.csatorna.felhasznalo_kezdemenyezte = true;
    kapcsolat.csatorna.onopen = function() {
      console.log("P2P csatorna megnyílt! Állapot:", kapcsolat.csatorna.readyState);
      if (kapcsolat.csatorna.felhasznalo_kezdemenyezte == true) {
        Fajlkezelo.mappa_megnyitasa(kapcsolat.id, "");
      }
    };
    kapcsolat.csatorna.onclose = () => console.log("P2P csatorna bezárult.");
    kapcsolat.csatorna.onerror = (err) => console.error("DataChannel hiba:", err);
    kapcsolat.csatorna.onmessage = function(event) {
        var uzenet = JSON.parse(event.data);
        Fajlkezelo.uzenet_fogadasa(kapcsolat.id, uzenet);
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
          console.log(data);
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
