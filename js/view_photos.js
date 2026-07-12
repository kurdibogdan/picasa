function setupDataChannelHandlers(channel) {
  channel.onopen = function() {
      console.log("P2P csatorna megnyílt! Állapot:", channel.readyState);
      if (channel.startedByUser == true) {
        openFolder("");
      }
  };
  channel.onclose = () => console.log("P2P csatorna bezárult.");
  channel.onerror = (err) => console.error("DataChannel hiba:", err);
  channel.onmessage = async function(event) {        
      var msg = JSON.parse(event.data);
      console.log("Üzenet érkezett:", msg.type);
      await processMessage(msg);
  };
}

async function processMessage(msg){
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
      fetchAndSendFile(msg.path);
      break;
    case "get_folder":
      console.log("Kliens kéri a mappa tartalmát: " + msg.path);
      await sendLocalFileList(msg.path);
      break;
    default:
      console.log("Ismeretlen bejövő üzenettípus: " + msg.type);
      break;
  }
}

function openFolder(path) {
  dataChannel.send(JSON.stringify({
    type: 'get_folder',
    path: path
  }));
}

function displayFileList(files, currentPath) {
  let t = "<div class='nagykeret'>";
  
  // Ha nem a gyökérben vagyunk, mutassunk "vissza" gombot
  if (currentPath) {
    let parentPath = currentPath.split('/').filter(Boolean);
    parentPath.pop();
    parentPath = parentPath.join('/');
    t += "<div class='keret'>"
       + " <div class='kiskep' onclick=\"openFolder('" + parentPath + "')\">"
       + "  <span>&#128281;</span>"
       + " </div>"
       + " <div class='nev'>..</div>"
       + " <div class='datum'>&nbsp;</div>"
       + "</div>";
  }
  
  // Mappák kilistázása:
  for (let i = 0; i < files.length; i++) {
    let item = files[i];
    if (item.tipus == "mappa") {
      let folderPath = currentPath ? currentPath + '/' + item.nev : item.nev;
      t += "<div class='keret'>"
         + " <div class='kiskep' onclick=\"openFolder('" + folderPath + "')\">"
         + "  <span>&#128193;</span>"
         + " </div>"
         + " <div class='nev'>" + item.nev + "</div>"
         + " <div class='datum'>" + item.datum + "</div>"
         + "</div>";
    } else {
      t += "<div class='keret'>"
         + " <div class='kiskep' "
         + "      style=\"background-image: url('" + item.kiskep + "');\""  // "&#128247;
         + "      onclick=\"getFile(" 
         + "        '" + item.nev + (item.tipus ? "." + item.tipus : "") + "', "
         + "        '" + (currentPath || '') + "'"
         + "      );\">"
         + " </div>"
         + " <div class='nev'>" + item.nev + "</div>"
         + " <div class='datum'>" + item.datum + "</div>"
         + "</div>";
    }
  }
  t += "</div>";
  document.getElementById("file-list").innerHTML = t;
}

function displayImage(base64Data) {
  document.getElementById("display-image").innerHTML = "<img src='" + base64Data + "'>";
}

function getFile(file, path) {
  let fullPath = path ? path + '/' + file : file;
  dataChannel.send(JSON.stringify({
    type: 'get_file',
    path: fullPath
  }));
}

// Egy konkrét kép beolvasása a helyi PHP-től és küldése
function fetchAndSendFile(path) {
  $.get("php/fajlkezelo.php", {
    "action": "file",
    "path": encodeURIComponent(path)
  }, function(data) {
    dataChannel.send(JSON.stringify({
      type: 'image_data',
      image: data
    }));
  });
}

// Fájllista lekérése a helyi PHP-től és továbbküldése P2P-n
async function sendLocalFileList(path) {
  $.get("php/fajlkezelo.php", {
    "action": "list",
    "path": encodeURIComponent(path)
  }, 
  function(data) {
    console.log(data);
    dataChannel.send(JSON.stringify({
      type: "file_list",
      path: (path || ''),
      files: JSON.parse(data)
    }));
  });
}
