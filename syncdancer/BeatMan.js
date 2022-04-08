class BeatMan {
    position;

    lastUpdate;

    temporarySpeed;
    temporarySpeedUntil;

    constructor() {
        this.position = 0;
        this.lastUpdate = 0;

        this.temporarySpeedUntil = 0;
    }

    update(time, lastBeat, nextBeat) {
        if (this.lastUpdate === 0)
            this.lastUpdate = time;

        let target = this.targetPosition(time, lastBeat, nextBeat);
        if (target < this.position)
            target += 1;

        const deltaTime = time-this.lastUpdate;
        this.lastUpdate = time;

        const maxSpeed = 1/(nextBeat-lastBeat);
        const maxDistance = 1.1*maxSpeed*deltaTime;
        const distance = target-this.position;

        if (distance < maxDistance) {
            this.position = target;
        } else {
            this.position += maxDistance;
        }

        if (this.position > 1)
            this.position -= Math.floor(this.position);

        return this.position;
    }

    targetPosition(time, lastBeat, nextBeat) {
        return (time-lastBeat)/(nextBeat-lastBeat);
    }
}

function lerp(a, b, t) {
    return a + (b-a)*t;
}