/*
Hogyan küldöd át a képet?
Amikor a kapcsolat áll (onopen), a megosztó gépén a JS beolvassa a helyi PHP-től
kapott képet, és egyszerűen elküldi:
*/
// A megosztó oldalán:
function sendPhoto(base64Data) {
  if (dataChannel.readyState === "open") {
    dataChannel.send(base64Data);
  }
}

function displayImage(base64Data) {
  document.getElementById("display-image").innerHTML = "<img src='" + base64Data + "'>";
}