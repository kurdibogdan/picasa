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
            displayFileList(msg.files, msg.path || '');
            break;
          case "image_data":
            // TODO: displayFileName(msg.filename);
            displayImage(msg.image);
            break;
          case "get_file":
            console.log("Kliens kéri a fájlt: " + msg.path);
            await fetchAndSendFile(msg.path);
            break;
          case "get_folder":
            console.log("Kliens kéri a mappa tartalmát: " + msg.path);
            await sendLocalFileList(msg.path);
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

function displayFileList(files, currentPath) {
  let t = "<table>";
  // Ha nem a gyökérben vagyunk, mutassunk "vissza" gombot
  if (currentPath) {
    let parentPath = currentPath.split('/').filter(Boolean);
    parentPath.pop();
    parentPath = parentPath.join('/');
    t += "<tr><td onclick=\"openFolder('" + parentPath + "')\">&#128281; ..</td><td></td><td></td></tr>";
  }
  for (let i = 0; i < files.length; i++) {
    let item = files[i];
    if (item.type === 'folder') {
      let folderPath = currentPath ? currentPath + '/' + item.name : item.name;
      t += "<tr><td onclick=\"openFolder('" + folderPath + "')\">&#128193; " + item.name + "</td>"
         + "<td>" + item.date + "</td><td></td></tr>";
    } else {
      t += "<tr><td onclick=\"getFile('" + item.name + "', '" + (currentPath || '') + "')\">"
         + "&#128247; " + item.name + "</td>"
         + "<td>" + item.date + "</td>"
         + "<td>" + item.thumbnail + "</td></tr>";
    }
  }
  t += "</table>";
  document.getElementById("file-list").innerHTML = t;
}

function openFolder(path) {
  dataChannel.send(JSON.stringify({
    type: 'get_folder',
    path: path
  }));
}

function getFile(file, path) {
  // Kombináljuk az útvonalat és a fájlnevet
  let fullPath = path ? path + '/' + file : file;
  dataChannel.send(JSON.stringify({
    type: 'get_file',
    path: fullPath
  }));
}
