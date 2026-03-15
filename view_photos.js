// Kliens oldali setupDataChannelHandlers kiegészítése
// 1. Definiáljuk a handler-eket egy külön függvényben
function setupDataChannelHandlers(channel) {
    channel.onopen = function() {
        console.log("P2P csatorna megnyílt!");
        // Ha mi vagyunk a megosztók, most küldhetjük a listát
        if (typeof sendLocalFileList === "function") {
            sendLocalFileList();
        }
    };

    channel.onmessage = async function(event) {        
        var msg = JSON.parse(event.data);
        console.log("Üzenet érkezett:", msg.type);
        
        switch(msg.type) {
          case "file_list":
            displayFileList(msg.files);
            break;
          case "image_data":
            // TODO: displayFileName(msg.filename);
            displayImage(msg.image);
            break;
          case "get_file":
            console.log("Kliens kéri a fájlt: " + msg.filename);
            await fetchAndSendFile(msg.filename);
            break;
          default:
            console.log("Ismeretlen bejövő üzenettípus: " + msg.type);
            break;
        }
    };
}

// 2. A KEZDEMÉNYEZŐ (Kliens) oldalán így hozd létre:
async function startConnection(targetPeerId) {
    remotePeerId = targetPeerId;
    
    // Itt jön létre a változó!
    dataChannel = pc.createDataChannel("photos");
    setupDataChannelHandlers(dataChannel); // Itt rendeljük hozzá az eseményeket

    var offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendToSignaling(targetPeerId, myId, { type: 'offer', sdp: offer });
}

// 3. A FOGADÓ (Megosztó) oldalán így kapod meg:
pc.ondatachannel = function(event) {
    dataChannel = event.channel; // Itt jön létre a változó!
    setupDataChannelHandlers(dataChannel); // Itt rendeljük hozzá az eseményeket
};

function displayFileList(files) {
  let t = "<table>";
  for (let i=0; i<files.length; i++) {
    t += "<tr><td onclick=\"getFile('" + files[i] + "')\">" + files[i] + "</td></tr>";
  }
  t += "</table>";
  document.getElementById("file-list").innerHTML = t;
}

function getFile(file) {
  dataChannel.send(JSON.stringify({
    type: 'get_file',
    filename: file
  }));
}
