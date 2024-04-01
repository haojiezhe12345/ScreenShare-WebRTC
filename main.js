const express = require('express');
const expressWs = require('express-ws');
const http = require('http');
const https = require('https');
const fs = require('fs');
const stun = require('stun');


// load config
//
try {
    var config = JSON.parse(fs.readFileSync('config/server.json'))
} catch (error) {
    var config = {}
}
const defaultConfig = {
    http_port: "3000",
    https_port: "3001",
    https_crt: "server.crt",
    https_key: "server.key",
}
var configUpdated = false
for (let key in defaultConfig) {
    if (config[key] == undefined) {
        config[key] = defaultConfig[key]
        configUpdated = true
    }
}
if (configUpdated) {
    try {
        fs.mkdirSync('config', { recursive: true })
        fs.writeFileSync('config/server.json', JSON.stringify(config, null, 2))
    } catch (error) { }
}


// init http(s) server
//
const app = express();
app.use(express.static('static'));

const httpServer = http.createServer(app);
const httpsServer = https.createServer({
    cert: fs.readFileSync(config.https_crt),
    key: fs.readFileSync(config.https_key)
}, app);

expressWs(app, httpServer);
expressWs(app, httpsServer);

httpServer.listen(config.http_port, () => { console.log(`HTTP server listening on :${config.http_port}`) })
httpsServer.listen(config.https_port, () => { console.log(`HTTPS server listening on :${config.https_port}`) })


// init STUN server
//
const server = stun.createServer({ type: 'udp4' })
server.listen(3478, null, () => { console.log(`STUN server listening on 0.0.0.0:3478`) })

server.on('bindingRequest', (req, rinfo) => {
    console.log(`Received STUN binding request from ${rinfo.address}:${rinfo.port}`)
    const response = stun.createMessage();
    response.setType(stun.constants.STUN_BINDING_RESPONSE);
    response.setTransactionID(req.transactionId);
    // respond with IP and port
    response.addAddress(rinfo.address, rinfo.port)
    server.send(response, rinfo.port, rinfo.address);
});


// peers list
//
var peers = {}

// signaling channel
//
app.ws('/signal', (ws, req) => {
    const name = req.query.name;
    const type = req.query.type;
    const ip = ws._socket.remoteAddress

    var reject = false
    // reject empty names
    if (name == null || name == '') {
        reject = 'name not specified'
        ws.close(1000, reject)
    }
    // init peer object
    else if (peers[name] == undefined) {
        peers[name] = {}
        peers[name][type] = ws
    }
    // reject multiple endpoints
    else if (peers[name][type] != undefined && peers[name][type]._socket.remoteAddress != ip) {
        reject = 'already registered'
        ws.close(1000, reject)
    }
    // update peers list
    else {
        peers[name][type] = ws
    }

    // reject or accept
    if (reject != false) {
        console.log(`[${name}] (${type}) REJECTED: ${reject}`);
        return
    }
    console.log(`[${name}] (${type}) CONNECTED (${ip})`);

    // clear lastOnline on peer connection
    delete peers[name].lastOnline

    // if both host and client are online, tells them to start peer connection
    if (peers[name].host != undefined && peers[name].client != undefined) {
        console.log(`[${name}] Telling host and client to start peer connection`)
        peers[name].host.send(JSON.stringify({ type: 'start' }))
        peers[name].client.send(JSON.stringify({ type: 'start' }))
    }

    // handle SDP & ICE messages
    ws.on('message', (e) => {
        try {
            msg = JSON.parse(e)
            console.log(`[${name}] (${type}): Received ${msg.type}`)

            // host SDP offer -> client
            if (msg.type == 'offer') {
                peers[name].client.send(JSON.stringify(msg))
            }
            // client SDP answer -> host
            else if (msg.type == 'answer') {
                peers[name].host.send(JSON.stringify(msg))
            }
            // exchange ICE candidates
            else if (msg.type == 'candidate') {
                peers[name][type == 'host' ? 'client' : 'host'].send(JSON.stringify(msg))
            }
        } catch (error) {
            console.warn(error)
        }
    });

    ws.on('close', () => {
        console.log(`[${name}] (${type}) DISCONNECTED`);
        if (peers[name][type] == ws) delete peers[name][type]
        // set lastOnline timestamp if both peers have been disconnected
        if (Object.keys(peers[name]).length == 0) {
            let ts = Date.now()
            console.log(`[${name}] Last online: ${ts}`)
            peers[name].lastOnline = ts
        }
    });
});

// WebSocket heartbeat
//
setInterval(() => {
    try {
        for (let name in peers) {
            for (let type in peers[name]) {
                if (peers[name][type].send instanceof Function) {
                    peers[name][type].send(JSON.stringify({ type: 'heartbeat' }))
                }
            }
        }
    } catch (error) {
        console.warn(error)
    }
}, 5000);

// get peers list
//
app.get('/peers', (req, res) => {
    result = {}
    for (let name in peers) {
        result[name] = {}
        for (let type in peers[name]) {
            result[name][type] = typeof (peers[name][type]) == 'object' ? true : peers[name][type]
        }
    }
    res.send(JSON.stringify(result));
})
