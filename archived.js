
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


// modify SDP to achieve higher bitrate (Chrome only)
printMsg('Modified SDP:')
const sdp1 = new RTCSessionDescription({
    type: answer.type,
    sdp: answer.sdp
        .replace(/(m=video.*\r\n)/g, `$1b=AS:20000\r\n`)
        .replace(/(a=fmtp:.*)\r\n/g, `$1;x-google-max-bitrate=20000;x-google-min-bitrate=20000;x-google-start-bitrate=20000\r\n`)
})
printMsg(sdp1)


if (e.track.kind == 'video') {
    const codecs = RTCRtpReceiver.getCapabilities('video').codecs;
    var selectedCodecIndex = codecs.findIndex(c => c.mimeType === "video/H264" && c.sdpFmtpLine === "level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f");
    const selectedCodec = codecs[selectedCodecIndex];
    codecs.splice(selectedCodecIndex, 1);
    codecs.unshift(selectedCodec);
    e.transceiver.setCodecPreferences(codecs);
}
