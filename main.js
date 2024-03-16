const express = require('express');
const expressWs = require('express-ws');
const http = require('http');
const https = require('https');
const fs = require('fs');

const app = express();
app.use(express.static('static'));

const httpServer = http.createServer(app);
const httpsServer = https.createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.crt')
}, app);

expressWs(app, httpServer);
expressWs(app, httpsServer);

httpServer.listen(3000)
httpsServer.listen(3001)

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
    // reject multiple hosts/clients
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

    // if both host and client are online, tells the host to start peer connection
    if (peers[name].host != undefined && peers[name].client != undefined) {
        console.log(`[${name}] telling host to start peer connection`)
        peers[name].host.send(JSON.stringify({ type: 'start' }))
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
                peers[name][type == 'client' ? 'host' : 'client'].send(JSON.stringify(msg))
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
    for (let obj in peers) {
        result[obj] = []
        for (let obj1 in peers[obj]) {
            result[obj].push(obj1)
        }
    }
    res.send(JSON.stringify(result));
})
