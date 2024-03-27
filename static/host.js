async function register(name) {
    // start local video
    //
    try {
        var stream = await navigator.mediaDevices.getDisplayMedia(
            {
                video: {
                    displaySurface: "monitor",
                    height: parseInt(document.getElementById('resolution').value),
                    frameRate: parseInt(document.getElementById('fps').value),
                },
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    suppressLocalAudioPlayback: false,
                },
            }
        );
    } catch (error) {
        printMsg(`Error accessing screen: ${error}`, 'error');
        return
    }

    playVideo(stream)

    // register on server
    initSignal(name, 'host')
}

// init RTCPeerConnection
//
function startPeer() {
    printMsg('Received request to start peer connection', 'success')
    initPeerConnection()
    // add video track
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
}

printMsg('Hello from host!')
if (window.location.protocol == 'http:') {
    printMsg('Screen sharing is not available over HTTP, please use HTTPS instead', 'error')
}
