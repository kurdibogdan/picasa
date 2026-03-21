function refreshPeerList() {
  $.get("peers.php", {action: "list", myId: myId}, function(data){
    const container = document.getElementById('peer-list-container');
    container.innerHTML = '';
    peers = JSON.parse(data);
    peers.forEach(peerId => {
        const div = document.createElement('div');
        div.className = 'peer-item';
        div.innerText = 'Csatlakozás: ' + peerId;
        div.onclick = function() {
            console.log("Kattintás történt, cél ID: " + peerId);
            startConnection(peerId); // webrtc.js
        };
        container.appendChild(div);
    });
  });
}

function startPolling(myId) {
  setInterval(function(){
    $.get("messaging.php", {myId: myId}, function(messages){
        messages.forEach(msg => {
          console.log("Új üzenet érkezett innen:", msg.senderId);
          handleIncomingSignaling(msg.senderId, msg.payload);  // webrtc.js
      });
    });
  }, 2000);
}

function sendToSignaling(receiverId, senderId, data) {
  $.post("messaging.php", JSON.stringify({
    receiverId: receiverId,
    senderId: senderId,
    payload: data // Itt megy majd az SDP vagy ICE candidate
  }));
}
