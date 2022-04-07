class VideoTime {
    video;
    offset;
    loopLength;
    numberOfBeats;

    fraction;
    lastUpdate;
    onUpdate;

    constructor(video, offset, loopLength, numberOfBeats, onUpdate) {
        this.video = video;
        this.offset = offset;
        this.loopLength = loopLength;
        this.numberOfBeats = numberOfBeats;

        this.fraction = 0;
        this.lastUpdate = 0;

        this.onUpdate = onUpdate;
    }

    update(time, lastBeat, nextBeat) {
        if (this.lastUpdate === 0)
            this.lastUpdate = time;

        const fractionThroughBeat = (time-lastBeat)/(nextBeat-lastBeat);
        let newFraction = fractionThroughBeat * this.fractionPerBeat();
        while(newFraction < this.fraction) {
            newFraction += this.fractionPerBeat();
        }
        this.fraction = newFraction;
        if (this.fraction > 1)
            this.fraction -= Math.floor(this.fraction);

        this.onUpdate(this);
    }

    nextBeatFraction() {
        return this.beat()/this.numberOfBeats;
    }

    fractionPerBeat() {
        return 1/this.numberOfBeats;
    }
}