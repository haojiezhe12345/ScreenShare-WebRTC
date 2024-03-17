const express = require('express');
const expressWs = require('express-ws');
const http = require('http');
const https = require('https');
const fs = require('fs');

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

// peers list
//
var peers = {}

// signaling channel
//
app.ws('/signal', (ws, req) => {
    const name = req.query.name;
    const type = req.query.type;

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
    // reject multiple hosts
    else if (type == 'host' && peers[name][type] != undefined) {
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
    console.log(`[${name}] (${type}) CONNECTED`);

    // if both host and client are online, tells them to start peer connection
    if (peers[name].host != undefined && peers[name].client != undefined) {
        console.log(`[${name}] telling host and client to start peer connection`)
        peers[name].host.send(JSON.stringify({ type: 'start' }))
        peers[name].client.send(JSON.stringify({ type: 'start' }))
    }

    // handle SDP & ICE messages
    ws.on('message', (e) => {
        try {
            msg = JSON.parse(e)
            console.log(`[${name}] (${type}): received ${msg.type}`)

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
            console.log(error)
        }
    });

    ws.on('close', () => {
        console.log(`[${name}] (${type}) DISCONNECTED`);
        delete peers[name][type]
    });
});

// get peers list
//
app.get('/peers', (req, res) => {
    result = {}
    for (let peer in peers) {
        result[peer] = []
        for (let type in peers[peer]) {
            result[peer].push(type)
        }
    }
    res.send(JSON.stringify(result));
})
