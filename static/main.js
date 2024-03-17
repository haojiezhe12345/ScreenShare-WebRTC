
// STUN server
//
const stun_address = `stun:${window.location.hostname}`


// UI
//
function printMsg(msg, type = null) {
    const consoleEl = document.getElementById('console')
    var msgEl = document.createElement('p')
    if (typeof (msg) != 'string') {
        msgEl.innerText = JSON.stringify(msg, null, 2)
    } else {
        msgEl.innerText = msg
    }
    if (type != null) msgEl.classList.add(type)
    consoleEl.appendChild(msgEl)
    consoleEl.scrollTop = consoleEl.scrollHeight
}

function playVideo(stream) {
    const videoEl = document.getElementById('videoPreview')
    if (videoEl.srcObject === stream) return

    videoEl.srcObject = stream;
    videoEl.play()
    if (window.stream) window.stream.getTracks().forEach(track => track.stop())
    window.stream = stream

    printMsg('Stream started', 'success');
    printMsg(stream.getVideoTracks()[0].getSettings())
    try {
        printMsg(stream.getAudioTracks()[0].getSettings())
    } catch (error) {
        printMsg('Audio track not found', 'warn')
    }
}

document.getElementById('console').onclick = (e) => {
    if (e.target.nodeName == 'P') {
        window.getSelection().selectAllChildren(e.target)
        navigator.clipboard.writeText(e.target.innerText)
    }
}


// WebSocket
//
function getWsAddress() {
    var l = window.location;
    return ((l.protocol == "https:") ? "wss://" : "ws://") + l.host
}

function initSignal(name, type) {
    if (window.socket) window.socket.close(1000, 'new connection requested')
    var socket = new WebSocket(`${getWsAddress()}/signal?name=${name}&type=${type}`);
    window.socket = socket

    socket.onopen = () => {
        printMsg('Websocket connection established', 'success')
        printMsg(`Waiting for ${type == 'host' ? 'client' : 'host'}...`)
    }

    socket.onmessage = (e) => {
        try {
            msg = JSON.parse(e.data)

            if (msg.type == 'start') {
                startPeer()
            } else if (msg.type == 'offer') {
                onReceiveSDPOffer(msg.data)
            } else if (msg.type == 'answer') {
                onReceiveSDPAnswer(msg.data)
            } else if (msg.type == 'candidate') {
                onReceiveICECandidate(msg.data)
            }

        } catch (error) {
            printMsg(`Error handling message from server:\n${error}`)
        }
    }

    socket.onclose = (e) => {
        printMsg(`Websocket connection closed (${e.code}), reason: ${e.reason}`, 'error')
        if (!e.wasClean) {
            printMsg('Attempting to reconnect...', 'error')
            setTimeout(() => {
                initSignal(name, type)
            }, 1000)
        }
    }
}


// RTC event handlers
//
function initPeerConnection() {
    printMsg("Initiating peer connection")
    try {
        if (window.peerConnection) window.peerConnection.close()
        var peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: stun_address }],
        });
    } catch (error) {
        printMsg("Your browser doesn't support WebRTC (RTCPeerConnection)", 'error')
        return
    }
    window.peerConnection = peerConnection

    peerConnection.onnegotiationneeded = async () => {
        const offer = await peerConnection.createOffer();
        printMsg('Created SDP offer:', 'warn')
        printMsg(offer, 'warn')
        peerConnection.setLocalDescription(offer)

        socket.send(JSON.stringify({
            type: 'offer',
            data: offer
        }))
        printMsg('SDP offer sent')
    }

    peerConnection.onicecandidate = (e) => {
        if (e.candidate) {
            printMsg('Created ICE candidate:', 'warn')
            printMsg(e.candidate, 'warn')

            socket.send(JSON.stringify({
                type: 'candidate',
                data: e.candidate
            }))
            printMsg('ICE candidate sent')
        }
    };

    peerConnection.oniceconnectionstatechange = (e) => {
        var state = e.currentTarget.iceConnectionState
        printMsg(`Connection state changed: ${state}`, state == 'connected' ? 'success' : 'warn')
    }
}

async function onReceiveSDPOffer(sdp) {
    printMsg('Received SDP offer:', 'success')
    printMsg(sdp, 'success')
    await peerConnection.setRemoteDescription(sdp);

    const answer = await peerConnection.createAnswer();
    printMsg('Created SDP answer:', 'warn')
    printMsg(answer, 'warn')
    await peerConnection.setLocalDescription(answer);

    socket.send(JSON.stringify({
        type: 'answer',
        data: answer
    }))
    printMsg('SDP answer sent')
}

async function onReceiveSDPAnswer(sdp) {
    printMsg('Received SDP answer:', 'success')
    printMsg(sdp, 'success')
    await peerConnection.setRemoteDescription(sdp);
}

function onReceiveICECandidate(candidate) {
    printMsg('Received remote ICE candidate:', 'success')
    printMsg(candidate, 'success')
    peerConnection.addIceCandidate(candidate)
}

