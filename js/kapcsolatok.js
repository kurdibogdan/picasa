const KAPCSOLATOK_FRISSITESI_PERIODUSA = 5000; // ms
const UZENETEK_FRISSITESI_PERIODUSA = 2000; // ms
var sajat_id = -1;

function bejelentkezes(callback) {
  $.get("php/bejelentkezes.php", function(data){
    sajat_id = data;
    if (typeof callback == "function"){
      callback();
    }
  });
}

function kapcsolatok_periodikus_frissitese() {
  $.get("php/kapcsolatok_frissitese.php", {sajat_id: sajat_id}, function(data){
    if (data.length > 0) console.log(data);
    var peers = jQuery.parseJSON(data);
    const container = document.getElementById('peer-list-container');
    container.innerHTML = '';
    peers.forEach(function(peerObj){
      if (peerObj.id != sajat_id) {
        const div = document.createElement('div');
        div.className = "peer-item";
        div.innerText = "Csatlakozás: " + peerObj.id;
        div.onclick = function(){startConnection(peerObj.id);}; // webrtc.js
        container.appendChild(div);
      }
    });
    setTimeout(kapcsolatok_periodikus_frissitese, KAPCSOLATOK_FRISSITESI_PERIODUSA);
  });
}

function uzenetek_periodikus_olvasasa() {
  $.get("php/uzenetek_fogadasa.php", {sajat_id: sajat_id}, function(data){
    if (data.length > 0) console.log(data);
    var uzenetek = jQuery.parseJSON(data);
    uzenetek.forEach(function(uzenet){
      console.log("Új üzenet érkezett innen:", uzenet.kuldo_id);
      handleIncomingSignaling(uzenet.kuldo_id, jQuery.parseJSON(uzenet.torzs));  // webrtc.js
    });
    setTimeout(function(){uzenetek_periodikus_olvasasa(sajat_id);}, UZENETEK_FRISSITESI_PERIODUSA);
  });
}
