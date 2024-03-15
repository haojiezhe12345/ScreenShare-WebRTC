
socket.send(JSON.stringify({ type: 'answerReceived' }))
printMsg('Telling server that SDP negotiation have been completed', 'warn')


// save ICE candidates for exchange after SDP negotiation completed
var SDPNegotiated = true
var ICECandidates = {
    host: [],
    client: [],
}


if (SDPNegotiated == false) {
    ICECandidates[type].push(JSON.stringify(msg))
} else { }


// exchange ICE candidates
if (msg.type == 'answerReceived') {
    SDPNegotiated = true
    for (let candidate of ICECandidates.host) {
        peers[name].client.send(candidate)
    }
    for (let candidate of ICECandidates.client) {
        peers[name].host.send(candidate)
    }
}

