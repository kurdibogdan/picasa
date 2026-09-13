
// 3. Beérkező üzenetek feldolgozása (Polling hívja meg a messaging.js-ből)
async function handleIncomingSignaling(kuldo_id, torzs) {
    console.log("Beérkező WebRTC üzenet típusa:", torzs.type);
    
    TESZT = Kapcsolatok.kapcsolat_fogadasa(kuldo_id);
    console.log("Létrejött kapcsolat: " + kuldo_id);
    
    setTimeout(async function(){
      let kapcsolat = await TESZT;
      // Ha kapunk valamit, rögzítsük, ki küldte, hogy tudjunk válaszolni.
      
      switch(torzs.type) {
        case "offer":
          await kapcsolat.pc.setRemoteDescription(new RTCSessionDescription(torzs.sdp));
          const answer = await kapcsolat.pc.createAnswer();
          await kapcsolat.pc.setLocalDescription(answer);
          
          $.post("php/uzenetek_kuldese.php", JSON.stringify({
            cimzett_id: kuldo_id,
            kuldo_id: sajat_id,
            torzs: { type: "answer", sdp: answer }
          }), function(data){
            console.log(data);
          });
          
          break;
        case "answer":
          // Ez nem működik még.
          // await kapcsolat.pc.setRemoteDescription(new RTCSessionDescription(torzs.sdp));
          break;
        case "candidate":
          try {
              await kapcsolat.pc.addIceCandidate(new RTCIceCandidate(torzs.candidate));
          } catch (e) {
              console.error("Hiba az ICE candidate hozzáadásakor:", e);
          }
          break;
        default:
          console.error("Hiba! Ismeretlen üzenettípus: " + torzs.type);
          break;
      }
      
      console.log("handleIncomingSignaling: OK");
    }, 100);
}

/*
  function sendToSignaling(receiverId, senderId, data) {
    $.post("php/uzenetek_kuldese.php", JSON.stringify({
      receiverId: receiverId,
      senderId: senderId,
      payload: data // Itt megy majd az SDP vagy ICE candidate
    }), function(data){
      console.log(data);
    });
  }
*/

