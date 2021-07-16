---
layout: post
title:  "Event sourcing for online minesweeper"
image: img/minesweeper/screen1.png
tag: minesweeper
published: false
---

## The problem

## The classical solution, and its pitfalls

## Event sourcing

## Logging events

Our goal is to create an event log, which we can load when we start the server. I'm going to start simple, bearing in
mind that I haven't implemented anything like this before.

For debugging purposes, there are lots of places in the code where I call `console.log` so that I can see what's going
on. I thought a neat idea would be to have `event.log` be the function to call to log an event. I could even have it
log the events to the console.

```javascript
class EventSource {
    log(event) {
        // todo: append it to a file or something
        console.log(event);
    }
}

export const event = new EventSource();
```

We also need to be able to queue events (either from a file, or from requests from players), and read an event off the
queue:

```javascript
class EventSource {
    constructor() {
        this.eventQueue = [];
    }

    log(event) {
        console.log(event);
    }

    queue(event) {
        this.eventQueue.push(event);
    }

    read() {
        return this.eventQueue.shift();
    }
}
```

### Our first event - revealing a tile

Here's my first event logged:

```javascript
reveal(player, worldCoords) {
    if (!player.isAlive()) {
        return;
    }
    const coords = vectorFloor(worldCoords);

    event.log({
        type: 'reveal',
        player: player.username,
        coords: coords
    });

    this.queueReveal(player, coords);
    this.handleRevealQueue();
}
```

While it looks simple, I had to think for a bit about what I want to do here. First off, I went with 'reveal' instead
of 'click' because I think the events should represent the action, rather than the cause of the action.

Also worth noting is that I log the event after checking if the player is alive. This is because I may change the way
death works with future updates, and I don't want random clicking from dead players being re-evaluated as actual game
actions later down the line.

Actually, this logic applies the other way too, and I think I should move the isAlive check to another part of the code.
The rule should be that if an event is run, that event must be generated in the log. I need to come back and carefully
consider this later.

I'm also choosing to use objects instead of arrays, so that it is easier to add or subtract fields from the events.

### Handling generated chunks

Revealing a tile will generate the surrounding chunks, if they don't exist already. Currently, I'm using Math.random to
choose the placement of mines in new chunks, so I have to log the mine placements in the event log. The other option
would be to use a seeded random number generator, but this stops me from changing the generation algorithm in the
future.

So, let's log the chunk generation:

```javascript
insertChunk(worldCoords, mineIndexes) {
    const existingChunk = this.chunks.getChunk(worldCoords);
    if (existingChunk) return existingChunk;

    const newChunk = new Chunk(worldCoords);
    event.log({
        type: 'new chunk',
        coords: newChunk.coords,
        mines: mineIndexes
    });
    // ... the rest of the insert chunk code
}
```

When loading the events from a file, the outcome of a 'reveal' may be dependent on the chunks that it generated. My
solution to this will be to read all the 'new chunk' events from the front of the queue. I'll show this later.

Now let's log everything else:

```javascript
flag(player, worldCoords) {
    if (!player.isAlive()) {
        return;
    }
    const coords = vectorFloor(worldCoords);

    let chunk = this.chunks.getChunk(coords);
    if (chunk) {
        chunk.flag(coords);
        event.log({
            type: 'flag',
            player: player.username,
            coords: coords
        });
        this.messageSender.chunk(chunk);
    }
}
```

For player moving, I'm actually going to save the floating-point location they move to (at least for now):

```javascript
move(player, worldCoords) {
    player.move(worldCoords);
    event.log({
        type: 'move',
        player: player.username,
        coords: worldCoords
    });
}
```

Here we're making sure to save only the hashed password, not the plaintext version:

```javascript
addPlayer(username, hashedPassword) {
    if (!this.getPlayer(username)) {
        this.players[username] = new Player(username, hashedPassword);
        event.log({
            type: 'register',
            username,
            hashedPassword
        });
    }
    return this.getPlayer(username);
}
```

This should be all we need right now, but I will add events for logging in and out later, which may be useful
information to have.

## Storing the event log

The solution I've picked is to append events to a file. We can do it very simply, like this:

```javascript
log(event) {
    console.log(event);
    fs.appendFileSync(LogFile, JSON.stringify(event)+'\n');
}
```

This is slow, because the IO operation blocks the main thread. The fs module for node provides asynchronous versions of
its operations, but those come with their own problems. Consider the following piece of code:

```javascript
for (let i=0; i<100; i++) {
    fs.appendFile('numbers', `${i}\n`, (err) => {});
}
```

Seems harmless enough - just append the numbers 0-99 to the file 'numbers'. Let's check the output to make sure it's
correct:

```
2
0
1
6
3
7
5
4
11
8
10
13
12
14
9
15
17
16
19
18
22
20
21
23
26
...
```

oh no

So yeah, I'd really prefer it if my events log didn't come out all jumbled just because I want it to go fast. This happens because multiple `appendFile`s are happening at the same time, and node has no
obligation to make sure that these happen in any particular order. We need to ensure that only one
append is happening at once.

The solution I've come up with uses what I'd call a 'lock'. We keep a boolean to keep track of whether
an append is in progress. If it is, then we queue the log in the log queue. If not, then we log all
the events in the log queue. Here's the code:

```javascript
import * as fs from 'fs';
import {EOL} from 'os';

const LogFile = './log';

class EventSource {
    constructor() {
        this.eventQueue = [];
        this.logQueue = [];

        this.appendingLogs = false;

        fs.writeFileSync(LogFile, ''); // Clears the log file
    }

    log(event) {
        console.log(event);

        this.logQueue.push(event);
        if (!this.appendingLogs) {
            this.appendingLogs = true;
            // Write all events in the log queue, separated by end of line.
            // EOL at the end because array.join doesn't add that.
            const toWrite = this.logQueue.map(e => JSON.stringify(e)).join(EOL)+EOL;
            // Clear the log queue so that events don't get written twice.
            this.logQueue = [];
            fs.appendFile(LogFile, toWrite, err => {
                if (err) {
                    throw "Can't append events to file";
                }
                // Allow more logs to be written
                this.appendingLogs = false;
            })
        }
    }

    queue(event) {
        this.eventQueue.push(event);
    }

    read() {
        return this.eventQueue.shift();
    }
}

export const event = new EventSource();
```

Now we get our logs written in order, without blocking the main thread. There's just one issue,
which is that events only get written to file when an event is logged, so some events will wait to
be written until the next log. We can fix this by flushing the logs again afterwards. I'm moving the
writing of events into another class to facilitate this:

```javascript
class EventWriter {
    constructor(fileName) {
        this.fileName = fileName;
        fs.writeFileSync(this.fileName, ''); // Clears the log file

        this.writeQueue = [];
        this.appending = false;
    }

    write(event) {
        this.writeQueue.push(event);
        this.flush();
    }

    flush() {
        if (this.writeQueue.length === 0 || this.appending) {
            return;
        }

        this.appending = true;
        // Write all events in the queue, separated by end of line.
        // EOL at the end because array.join doesn't add that.
        const toWrite = this.writeQueue.map(e => JSON.stringify(e)).join(EOL)+EOL;
        // Clear the log queue so that events don't get written twice.
        this.writeQueue = [];
        fs.appendFile(this.fileName, toWrite, err => {
            if (err) {
                throw "Can't append events to file";
            }
            // Allow more logs to be written
            this.appending = false;

            this.flush(); // Flush again, in case there are any events left in the queue
        });
    }
}
```

One more thing - I don't want to overwrite the log files, I want to make a new one each time I launch
the server. I can worry about storing all this redundant data later (each log file will start with the
contents of the previous file, if my code is working properly). Right now, I'll add the date to the
file name. Javascript doesn't have great support for formatting dates out of the box, so I'm using a
module I found online here: https://github.com/felixge/node-dateformat

```javascript
this.writer = new EventWriter(`./logs/log_${dateformat(new Date(), "yyyymmdd-HHMMss")}`);
```

However, now we need to know which log file to load when we start the server. There are a few solutions
to this, one is to sort the files by date created and pick the newest, or the path to the file could be
provided as a command line argument, or we could maintain a symbolic link to the latest log file.

I'll go with the first one for now, I don't see any immediate problems with it.

## Running events from file

A few paragraphs ago I wrote these methods:

```javascript
queue(event) {
    this.eventQueue.push(event);
}

read() {
    return this.eventQueue.shift();
}
```

The idea was to load the whole log file at once, and queue each event as we parse the line. The problem
with this is that we need to keep the whole log, which could be millions of lines, in memory at once.

A better solution in this regard is to read the file line by line, only as we need to. I have to say that
I do not like the stock solution node.js has for this, where the file is read and an event is fired for 
each line. I want to be able to ask for a line to be read, rather than it just happening and being told
about it. I'd love to be able to write `std::cin >> event`, but I have to install a module. I chose this
one: https://github.com/nacholibre/node-readlines