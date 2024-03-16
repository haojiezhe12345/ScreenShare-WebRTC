
// STUN server
//
const stun_address = 'stun:stun.qq.com'


// Misc
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
    window.stream = stream

    printMsg('Stream started', 'success');
    printMsg(stream.getVideoTracks()[0].getSettings())
    try {
        printMsg(stream.getAudioTracks()[0].getSettings())
    } catch (error) {
        printMsg('Audio track not found', 'warn')
    }
}

function getWsAddress() {
    var l = window.location;
    return ((l.protocol == "https:") ? "wss://" : "ws://") + l.host
}

document.getElementById('console').onclick = (e) => {
    if (e.target.nodeName == 'P') {
        window.getSelection().selectAllChildren(e.target)
        navigator.clipboard.writeText(e.target.innerText)
    }
}


// RTC event handlers
//
function initPeerConnection() {
    printMsg("Initiating peer connection")
    try {
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

