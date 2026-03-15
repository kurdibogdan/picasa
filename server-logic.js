// 1. A helyi PHP elérése (feltételezzük, hogy a php -S localhost:80 fut)
const LOCAL_PHP_URL = 'http://localhost/picasa/local_photos.php';

// 2. A DataChannel eseménykezelője (amikor a kliens üzenetet küld)
function setupDataChannelHandlers() {
    dataChannel.onopen = () => {
        console.log("P2P csatorna nyitva a kliens felé!");
        // Amint megnyílik, elküldjük a fájllistát a kliensnek
        sendLocalFileList();
    };

    // dataChannel.onmessage = async (event) => {
    //     const request = JSON.parse(event.data);
    //     
    //     // Ha a kliens egy konkrét fájlt kér: { type: 'get_file', filename: 'foto1.jpg' }
    //     if (request.type === 'get_file') {
    //         console.log("Kliens kéri a fájlt: " + request.filename);
    //         await fetchAndSendFile(request.filename);
    //     }
    // };
}

// 3. Fájllista lekérése a helyi PHP-től és továbbküldése P2P-n
async function sendLocalFileList() {
    try {
        const response = await fetch(LOCAL_PHP_URL + '?action=list');
        const files = await response.json();
        
        // Elküldjük a listát a távoli kliensnek a P2P csatornán
        dataChannel.send(JSON.stringify({
            type: 'file_list',
            files: files
        }));
    } catch (e) {
        console.error("Nem sikerült elérni a helyi PHP-t! Fut a localhost:8000?", e);
    }
}

// 4. Egy konkrét kép beolvasása a helyi PHP-től és küldése
async function fetchAndSendFile(filename) {
    try {
        const response = await fetch(LOCAL_PHP_URL + '?file=' + encodeURIComponent(filename));
        const fileData = await response.json(); // { filename: '...', data: 'data:image/...' }
        
        // A teljes Base64 kódolt képet átküldjük a P2P csatornán
        dataChannel.send(JSON.stringify({
            type: 'image_data',
            filename: fileData.filename,
            image: fileData.data
        }));
    } catch (e) {
        console.error("Hiba a kép beolvasásakor:", e);
    }
}
