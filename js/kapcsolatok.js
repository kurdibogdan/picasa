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
/* Kapcsolat felvétele:
   1. PHP kilistázza az elérhető peereket.
   2. Kapcsolatok.kapcsolat_kezdemenyezese(peer_id)
      3. üzenet küldése PHP szerveren keresztül a peer_id-nak: offer(sdp)
   4. A másik fél fogadja a PHP szervertől az üzenetet: handleIncomingSignaling().
      5. válaszol a PHP szerveren keresztül a feladónak: answer(sdp)
   
   ---
   Ki küld candidate-et, ki fogadja, mit válaszol?
   Kell még valamit csinálni, hogy létrejöjjön a kapcsolat?
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
      if (data.length > 0) console.log(data);  // DEBUG
      if (data != Kapcsolatok.elozo_kapcsolatok) {
         
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
            let kapcsolodva = false;
            for (let letrejott_kapcsolat of Kapcsolatok.letrejott_kapcsolatok) {
              if (peerObj.id == letrejott_kapcsolat.id) {
                kapcsolodva = true;
                break;
              }
            }
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
    // TODO: Ez csak egy vázlatos valami, nem biztos, hogy működik.
    console.log("Kapcsolat fogadása: " + tavoli_id);
    var kapcsolat = {};
    kapcsolat.id = tavoli_id;
    Kapcsolatok.peer_beallitasa(kapcsolat);
    // Nem állítunk be csatornát.
    // Nem kezdeményezünk összekapcsolódást, mert a másik már megtette.
    
    // TODO: legyen visszajelzés arról, hogy sikerült-e összekapcsolni, és csak akkor vegye fel a létrejött kapcsolatokhoz, ha igen.
    Kapcsolatok.letrejott_kapcsolatok.push(kapcsolat);
    return(kapcsolat);
  },
  
  peer_beallitasa: function(kapcsolat){
  // bejovo_kapcsolat_felvetele:
    const RTC_BEALLITASOK = {iceServers: [{ urls: "stun:stun.l.google.com:19302" }]};
    kapcsolat.pc = new RTCPeerConnection(RTC_BEALLITASOK); //  var PC = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
    
    // 1. ICE Candidate kezelés
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
    /// 
    // 2. A FOGADÓ (Megosztó) oldalon a csatorna fogadása
    kapcsolat.pc.ondatachannel = function(event) {
      console.log("DataChannel érkezett a távoli féltől!");
    ///   dataChannel = event.channel;              // Itt jön létre a változó!
    ///   kapcsolat.csatorna_beallitasa(dataChannel);    // 5. Eseménykezelők beállítása a csatornához
    };
  
  },
  
  csatorna_beallitasa: function(kapcsolat) {
    kapcsolat.csatorna = kapcsolat.pc.createDataChannel("photos");
    kapcsolat.csatorna.felhasznalo_kezdemenyezte = true;
    kapcsolat.csatorna.onopen = function() {
      console.log("P2P csatorna megnyílt! Állapot:", kapcsolat.csatorna.readyState);
      if (kapcsolat.csatorna.felhasznalo_kezdemenyezte == true) {
        openFolder("");
      }
    };
    kapcsolat.csatorna.onclose = () => console.log("P2P csatorna bezárult.");
    kapcsolat.csatorna.onerror = (err) => console.error("DataChannel hiba:", err);
    kapcsolat.csatorna.onmessage = async function(event) {
        var msg = JSON.parse(event.data);
        console.log("Üzenet érkezett:", msg.type);
        await processMessage(msg);
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
