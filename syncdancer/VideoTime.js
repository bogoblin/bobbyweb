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

    update(posInBeat) {
        let newFraction = posInBeat / this.numberOfBeats;
        while(newFraction < this.fraction)
            newFraction += 1/this.numberOfBeats;

        this.fraction = newFraction;
        if (this.fraction > 1)
            this.fraction -= Math.floor(this.fraction);

        this.onUpdate(this);
    }
}