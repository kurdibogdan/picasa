/*
Íme a sima JavaScript megvalósítás, ami külső könyvtárak nélkül építi fel a kapcsolatot a korábban megírt PHP "postafiókon" keresztül.
A WebRTC-ben két szerep van: az Initiator (aki a weboldalt böngészi) és a Receiver (a képeket megosztó "szerver" felhasználó).

A WebRTC kézfogás folyamata sima JS-el
*/
// webrtc.js
// Konfiguráció: Ingyenes Google STUN szerverek
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
let pc = new RTCPeerConnection(config);
let dataChannel;
let remotePeerId = null; // Fontos: globálisan tároljuk, kivel beszélünk

// 1. ICE Candidate kezelés
pc.onicecandidate = (event) => {
    if (event.candidate && remotePeerId) {
        console.log("ICE candidate küldése...");
        sendToSignaling(remotePeerId, myId, { type: 'candidate', candidate: event.candidate });
    }
};

// 2. Kapcsolat kezdeményezése (Kliens oldal)
async function startConnection(targetPeerId) {
    console.log("Kapcsolódás kezdeményezése: " + targetPeerId);
    remotePeerId = targetPeerId;
    
    // Csatorna létrehozása
    dataChannel = pc.createDataChannel("photos");
    setupDataChannelHandlers(dataChannel); // Paraméterként adjuk át!

    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log("Offer elkészült, küldés...");
        sendToSignaling(targetPeerId, myId, { type: 'offer', sdp: offer });
    } catch (e) {
        console.error("Hiba az offer létrehozásakor:", e);
    }
}

// 3. Beérkező üzenetek feldolgozása (Polling hívja meg a messaging.js-ből)
async function handleIncomingSignaling(senderId, payload) {
    console.log("Beérkező WebRTC üzenet típusa:", payload.type);
    
    // Ha kapunk valamit, rögzítsük, ki küldte, hogy tudjunk válaszolni
    if (!remotePeerId) remotePeerId = senderId;

    if (payload.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendToSignaling(senderId, myId, { type: 'answer', sdp: answer });
        
    } else if (payload.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        
    } else if (payload.type === 'candidate') {
        try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (e) {
            console.error("Hiba az ICE candidate hozzáadásakor:", e);
        }
    }
}

// 4. A megosztó oldalon a csatorna fogadása
pc.ondatachannel = (event) => {
    console.log("DataChannel érkezett a távoli féltől!");
    dataChannel = event.channel;
    setupDataChannelHandlers(dataChannel);
};

// 5. Eseménykezelők beállítása a csatornához
function setupDataChannelHandlers(channel) {
    channel.onopen = () => {
        console.log("P2P Kapcsolat kész! Állapot:", channel.readyState);
    };

    channel.onmessage = (event) => {
        console.log("Üzenet érkezett a P2P csatornán.");
        // Itt hívjuk meg a view_photos.js-ben lévő megjelenítőt
        if (typeof handlePeerMessage === "function") {
            handlePeerMessage(event.data);
        }
    };

    channel.onclose = () => console.log("P2P csatorna bezárult.");
    channel.onerror = (err) => console.error("DataChannel hiba:", err);
}
