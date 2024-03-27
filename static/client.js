function register(name) {
    // register on server
    initSignal(name, 'client')
}

// init RTCPeerConnection
//
function startPeer() {
    printMsg('Received request to start peer connection', 'success')
    initPeerConnection()
    // listen for video track
    peerConnection.ontrack = (e) => {
        playVideo(e.streams[0])
    }
}

// listen for video data and print info
videoEl.onloadeddata = () => {
    printMsg(`Video loaded: ${videoEl.videoWidth}x${videoEl.videoHeight}`, 'success')
    printPeerCodec()
}

getRecvCodec()

printMsg('Hello from client!')
