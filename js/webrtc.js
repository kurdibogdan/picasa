// 3. Beérkező üzenetek feldolgozása (Polling hívja meg a messaging.js-ből)
const varakozo_jeloltek = {};

async function handleIncomingSignaling(kuldo_id, torzs) {
  console.log("Beérkező WebRTC üzenet típusa: ", torzs.type);
  
  let kapcsolat = await Kapcsolatok.kapcsolat_fogadasa(kuldo_id);
  
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
      
      // Várakozó jelöltek feldolgozása:
      if (varakozo_jeloltek[kuldo_id]) {
        for (let candidate of varakozo_jeloltek[kuldo_id]) {
          try {
            await kapcsolat.pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error("Hiba az ICE candidate hozzáadásakor:", e);
          }
        }
        delete varakozo_jeloltek[kuldo_id];
      }
      break;
      
    case "answer":
      await kapcsolat.pc.setRemoteDescription(new RTCSessionDescription(torzs.sdp));
      
      // Process any pending candidates
      if (varakozo_jeloltek[kuldo_id]) {
        for (let candidate of varakozo_jeloltek[kuldo_id]) {
          try {
            await kapcsolat.pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error("Hiba az ICE candidate hozzáadásakor:", e);
          }
        }
        delete varakozo_jeloltek[kuldo_id];
      }
      break;
      
    case "candidate":
      // Check if remote description is set
      if (kapcsolat.pc.remoteDescription) {
        try {
          await kapcsolat.pc.addIceCandidate(new RTCIceCandidate(torzs.candidate));
        } catch (e) {
          console.error("Hiba az ICE candidate hozzáadásakor:", e);
        }
      } else {
        // Buffer the candidate for later
        if (!varakozo_jeloltek[kuldo_id]) {
          varakozo_jeloltek[kuldo_id] = [];
        }
        varakozo_jeloltek[kuldo_id].push(torzs.candidate);
        console.log("ICE candidate buffered, waiting for remote description");
      }
      break;
      
    default:
      console.error("Hiba! Ismeretlen üzenettípus: " + torzs.type);
      break;
  }
  
  console.log("handleIncomingSignaling: OK");
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

