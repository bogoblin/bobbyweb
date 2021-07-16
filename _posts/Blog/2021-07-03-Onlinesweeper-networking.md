---
layout: post
title:  "Real-time web game networking with web sockets"
image: img/minesweeper/screen1.png
tag: minesweeper
published: false
---

I definitely regret not documenting this as I went along, but I'm nevertheless pleased that I have the opportunity to
do so now. The network code I have currently is a bit of a mess, and I need to redesign it before I move on.

## What's a Web Socket?

From RFC 6455:

> The goal of
this technology is to provide a mechanism for browser-based
applications that need two-way communication with servers that does
not rely on opening multiple HTTP connections (e.g., using
XMLHttpRequest or iframes and long polling).

For those uninitiated, polling is where the client periodically sends requests to the server, and the server sends a
response back each time. The way this might work in my minesweeper game, is that every second or so, the client would
ask the server if anything has changed, and to send back the new state if it has. This would mean that the server
would have to deal with many requests constantly, and we'd either have to send the entire game state each time, or come
up with a complex system to determine what to send in each response, different for each player and dependent on what
information the player has already.

With web sockets, we can instead keep a channel of communication open between the server and each player, and the server
would only send updates when the state changes.

Web sockets are quite simple to use. Node.js has the `ws` module, which can host a server like so:

```javascript
const server = new ws.Server({
    port: 8081
});

server.on('connection', socket => {
    socket.on('message', message => {
        // do something with the message, eg.
        const messageJson = JSON.parse(message);
        console.log(messageJson);
    });
});
```

and we can connect to it from the client:

```javascript
socket = new WebSocket(`ws://${location.hostname}:8081`);
socket.onmessage = ev => {
    receiveMessage(ev);
}

socket.addEventListener('open', () => {
    socket.send(JSON.stringify({greeting: "hello web socket"}));
});
```

## Sending chunks

The main bit of state that we need to let the clients know about is updates to the board. Later we will implement a
system for only sending the changed tiles (known as delta encoding), but we still need to send full chunks to the
players when they connect to the server.

A basic, easy, and inefficient way of doing this is to just use `JSON.stringify` to send the chunks over.

I skipped straight past this because I knew it wouldn't be adequate in the long run, which may have been a bit premature. 
I was worrying about how the performance would scale with the number of users before I even had any. I don't think it's
a bad thing to be thinking about this stuff throughout the project, but just make sure you write the code in a way that
is easy to change later.

What I came up with was a byte array serialization approach. My Chunk class has a serialize method:

```javascript
serialize() {
    const coords = new Uint8Array(Int32Array.from(this.coords).buffer);
    const tiles = this.tiles;
    const data = new Uint8Array(8 + chunkSize*chunkSize);
    data.set(coords, 0);
    data.set(tiles, 8);
    return data;
}
```

To go with this is a method for converting the binary data back into a chunk:

```javascript
export const chunkDeserialize = (data) => {
    const tiles = data.slice(8);
    const coords = new Int32Array(data.slice(0,8).buffer);

    return new Chunk(Array.of(...coords), tiles);
}
```

If you're doing this, keep the two procedures close to each other in the code, and write some tests to make sure that
both methods work properly. It's really easy to break something like this.

## Message parsing hell

After working on the project for a while, and having to send all kinds of messages back and forth, I've ended up with
some nasty looking code. Have a look at this mess:

```javascript
receiveMessage(ev) {
    new Response(ev.data).arrayBuffer()
        .then(a => {
            const data = new Uint8Array(a);
            const message = ServerMessage.serverMessageDeserialize(data);
            if (!message || !message.operation) {
                console.log(data);
                return;
            }
            switch (message.operation) {
                case ServerMessage.Operation.Chunk:
                    const chunk = message.content;
                    this.tileMap.addChunk(chunk);
                    break;
                case ServerMessage.Operation.General:
                    const general = message.content;
                    switch (general.messageType) {
                        case GeneralMessages.Welcome: {
                            this.username = general.username;
                            const player = this.players[this.username];
                            console.log(this.players);
                            if (player) {
                                this.tileView.viewCenter = player.position;
                                this.players[player.name] = player;
                            }
                            this.onWelcome();
                            this.onPlayerUpdate();
                            this.currentError = null;
                        }
                            break;
                        case GeneralMessages.Error: {
                            this.error(general.err);
                        }
                            break;
                        case GeneralMessages.Player: {
                            const player = general.player;
                            const newPlayer = new Player();
                            newPlayer.username = player.username;
                            newPlayer.score = player.score;
                            newPlayer.deadUntil = player.deadUntil;
                            newPlayer.position = player.position;
                            this.players[player.username] = newPlayer;
                            this.onPlayerUpdate();
                        }
                            break;
                        default:
                    }
                    break;
            }
        })
}
```

This method is responsible for doing too many things, and it looks like I've neglected to put any comments in it!
I'm being a bit dramatic, it's not that bad, but as the number of features grows, this method and others like it will
grow too.

There's also low level byte reading, validation necessary, scary error prone code like this:

```javascript
const leader = String.fromCharCode(data[0]);
const serialized = data.slice(1);
switch (leader) {
    case Operation.Chunk:
        return new ServerMessage(Operation.Chunk, chunkDeserialize(serialized));
    case Operation.General:
        return new ServerMessage(Operation.General, JSON.parse(decoder.decode(serialized)));
    default:
}
```

It's become a bit of a mess, so I'm getting some external help in the form of...

## Socket.io

Funnily enough, I used socket.io in the original prototype I made, and now I'm going back to it after deciding to go 
with the raw web sockets this time. My rationale for going with this was that I wanted to be flexible with the
serialization, so I could adjust to reduce bandwidth.

However, after becoming irritated with my network code, I did some reading on socket.io and found that it has support
for MessagePack, a protocol for serializing JS objects efficiently.

So, in the rest of this post, I'm going to go through the code I currently have, and rewrite it.

So let's `npm install -s socket.io socket.io-msgpack-parser`, and get started!

## Incoming Messages

Currently, there's the deceptively named `MessageSender` class which handles incoming messages on the server. It also
sends messages. The reason it is named this is that it is given to the game engine for sending messages, which decouples
network code from game code. In the game engine, updates can either be sent to individual players or to all connected
players.

One thing that has become annoying about the code currently is that there's loads of wrapping up messages, so the game
engine has to do things like this:

```javascript
this.chunks.addChunk(chunk);
if (this.messageSender) {
    this.messageSender.sendToAll(new ServerMessage(Operation.Chunk, chunk));
}
```

This is error prone and difficult to read. I'm sending a chunk, why do I have to put it in a message class and tell
the constructor what kind of message I'm sending? I'd much rather have something like this:

```javascript
this.chunks.addChunk(chunk);
this.messageSender.sendToAll(chunk);
```

At that point the message sender can decide what to do.