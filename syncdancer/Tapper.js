class Tapper {
    taps;

    msPerBeat;
    lastBeat;
    nextBeat;

    constructor() {
        this.resetTaps();

        this.msPerBeat = 500;
        this.lastBeat = performance.now();
        this.nextBeat = this.lastBeat+this.msPerBeat;
        this.whenNextBeat(this.lastBeat);
    }

    whenNextBeat(time) {
        this.nextBeat = this.lastBeat + this.msPerBeat;
        if (time > this.nextBeat) {
            this.lastBeat += this.msPerBeat;
            this.nextBeat = this.lastBeat + this.msPerBeat;
        }
        if (time > this.nextBeat) {
            this.lastBeat = time;
            return this.whenNextBeat(time);
        }
        return this.nextBeat;
    }

    resetTaps() {
        this.taps = [];
    }

    tap(time) {
        if (this.taps.length === 0) {
            this.taps.push(time);
            return;
        }

        const timeSinceLastTap = time - this.lastTap();
        if (timeSinceLastTap > 2000) this.resetTaps();

        this.taps.push(time);
        if (this.taps.length >= 4) {
            this.msPerBeat = (this.lastTap() - this.taps[0])/(this.taps.length-1);
            this.lastBeat = time;
        }
    }

    lastTap() {
        if (this.taps.length === 0)
            return 0;

        return this.taps[this.taps.length-1];
    }

    multiply(factor) {
        this.msPerBeat *= factor;
    }

    bpm() {
        return (60*1000/this.msPerBeat).toFixed(2);
    }
}