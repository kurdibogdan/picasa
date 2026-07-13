/*
  Íme a sima JavaScript megvalósítás, ami külső könyvtárak nélkül építi fel a kapcsolatot a korábban megírt PHP "postafiókon" keresztül.
  A WebRTC-ben két szerep van: az Initiator (aki a weboldalt böngészi) és a Receiver (a képeket megosztó "szerver" felhasználó).
  A WebRTC kézfogás folyamata sima JS-el.
*/

// Konfiguráció:
// const config = {};
//      A böngésző alapértelmezett STUN/TURN szerverét használja.
//      Localhoston helyi IP-hez köti, ami nem fog működni távoli szerveren.
//      Firefoxban ki kell kapcsolni: media.peerconnection.ice.obfuscate_host_addresses
//      Sajnos még ez sem segít, kellene indítani helyi STUN/TURN szervert.
// const config = { iceServers: [] };
//      Teljesen letiltja a STUN/TURN szerver használatát.
//      Ez sem helyi szerveren, sem távolin nem működött.
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
//      Google szerverét állítja be explicit módon, így a helyi és távoli peerek megtalálják egymást.

let pc = new RTCPeerConnection(config);
let dataChannel;
let remotePeerId = null; // Fontos: globálisan tároljuk, kivel beszélünk

// 1. ICE Candidate kezelés
pc.onicecandidate = (event) => {
    console.log("ICE Candidate");
    if (event.candidate && remotePeerId) {
        console.log("ICE candidate küldése...");
        sendToSignaling(remotePeerId, sajat_id, { type: 'candidate', candidate: event.candidate });
    }
};

// 2. A FOGADÓ (Megosztó) oldalon a csatorna fogadása
pc.ondatachannel = function(event) {
    console.log("DataChannel érkezett a távoli féltől!");
    dataChannel = event.channel; // Itt jön létre a változó!
    setupDataChannelHandlers(dataChannel); // 5. Eseménykezelők beállítása a csatornához
};

// 2. A KEZDEMÉNYEZŐ (Kliens) oldalán így hozd létre:
async function startConnection(targetPeerId) {
    console.log("Kapcsolódás kezdeményezése: " + targetPeerId);
    remotePeerId = targetPeerId;    // !! Ez a webrtc.js globális változója !!
    
    // Csatorna létrehozása
    dataChannel = pc.createDataChannel("photos");   // !! Ez is !!
    dataChannel.startedByUser = true;
    setupDataChannelHandlers(dataChannel); // Paraméterként adjuk át!

    try {
      var offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendToSignaling(targetPeerId, sajat_id, { type: 'offer', sdp: offer });
    } catch (e) {
      console.error("Hiba az offer létrehozásakor:", e);
    }

}

// 3. Beérkező üzenetek feldolgozása (Polling hívja meg a messaging.js-ből)
async function handleIncomingSignaling(senderId, payload) {
    console.log("Beérkező WebRTC üzenet típusa:", payload.type);
    
    // Ha kapunk valamit, rögzítsük, ki küldte, hogy tudjunk válaszolni.
    if (!remotePeerId) remotePeerId = senderId;
    switch(payload.type) {
      case "offer":
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendToSignaling(senderId, sajat_id, { type: "answer", sdp: answer });
        break;
      case "answer":
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        break;
      case "candidate":
        try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (e) {
            console.error("Hiba az ICE candidate hozzáadásakor:", e);
        }
        break;
      default:
        console.error("Hiba! Ismeretlen üzenettípus: " + payload.type);
        break;
    }
}

function sendToSignaling(receiverId, senderId, data) {
  $.post("php/uzenetek_kuldese.php", JSON.stringify({
    receiverId: receiverId,
    senderId: senderId,
    payload: data // Itt megy majd az SDP vagy ICE candidate
  }), function(data){
    console.log(data);
  });
}
