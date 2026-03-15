/*
2. Sima JavaScript a küldéshez és fogadáshoz
Ezt a logikát kell használnia mind a megosztónak, mind a kliensnek a böngészõben.
*/
// Üzenet küldése a PHP-nak
async function sendToSignaling(receiverId, senderId, data) {
    await fetch('messaging.php', {
        method: 'POST',
        body: JSON.stringify({
            receiverId: receiverId,
            senderId: senderId,
            payload: data // Itt megy majd az SDP vagy ICE candidate
        })
    });
}

// Folyamatos lekérdezés (Polling)
function startPolling(myId) {
  setInterval(async () => {
    try {
      const response = await fetch(`messaging.php?myId=${myId}`);
      const text = await response.text();
      
      // Csak akkor próbáljuk parsolni, ha nem üres a válasz
      if (text && text !== "[]") {
        const messages = JSON.parse(text);
        messages.forEach(msg => {
          console.log("Új üzenet érkezett innen:", msg.senderId);
          
          // FONTOS: Átadjuk a küldõt is (msg.senderId) és az adatot is (msg.payload)
          // A webrtc.js-ben korábban javítottuk ezt a függvényt, hogy fogadja mindkettõt!
          handleIncomingSignaling(msg.senderId, msg.payload); 
        });
      }
    } catch (e) {
      console.error("Hiba a polling során:", e);
    }
  }, 2000);
}
