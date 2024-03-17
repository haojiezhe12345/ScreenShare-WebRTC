# ScreenShare-WebRTC
Browser-based screen share over WebRTC P2P connections

## Prerequisites
- Clone the source or download zip
- Have Node.js 20 installed (lower version may work, but not tested)

## Run
Install all required packages with:

```npm install```

Then run the main server with:

```node main.js```

## Configuration
Server config is saved in ```config/server.json```

## Usage
Host (source) page: ```/host.html```

Client (receiver) page: ```/client.html```

WebSocket signaling channel: ```/signal?name=<name>&type=<host|client>```

Peers list: ```/peers```

**To start streaming, the host and client should enter a common name.\
Once both sides are registered on the server, the stream will start.**

The stream is transmitted over P2P connections, so it's best used under LANs, or peers with open NAT.

Video quality is 720p 60fps, but will drop to 30fps or lower if video motion is intensive.\
Higher resolution is not recommended as it may cause low framerate. You can change it in ```host.html``` if you wish.
