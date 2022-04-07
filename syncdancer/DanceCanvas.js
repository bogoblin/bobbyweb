class DanceCanvas {
    canvas;
    gifs;

    mode;
    toDraw;

    tileWidth;
    tileHeight;

    constructor() {
        this.canvas = document.createElement("canvas");
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        document.body.append(this.canvas);

        window.addEventListener("resize", () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        });

        this.gifs = {};
        this.toDraw = [];

        this.mode = "TILE";

        this.tileWidth = 200;
        this.tileHeight = 200;
    }

    addGif(name, gif) {
        this.gifs[name] = gif;
    }

    draw() {
        if (this.tileWidth <= 0) {
            this.tileWidth = 200;
        }
        if (this.tileHeight <= 0) {
            this.tileHeight = 200;
        }

        if (this.toDraw.length === 0) return;

        let i = 0;
        let g = this.gifs[this.toDraw[i]];
        if (!g) return;

        const ctx = this.canvas.getContext("2d");
        switch (this.mode) {
            case "TILE":
                for (let x = 0; x < this.canvas.width; x += this.tileWidth) {
                    for (let y = 0; y < this.canvas.height; y += this.tileHeight) {
                        let g = this.gifs[this.toDraw[i]];
                        if (!g) continue;
                        ctx.drawImage(g, x, y, this.tileWidth, this.tileHeight);
                        i+=1;
                        i %= this.toDraw.length;
                    }
                }
                break;
            case "FILL":
                const heightScale = this.canvas.height/g.height;
                let width = g.width * heightScale;
                let height = this.canvas.height;
                let xOff = (this.canvas.width - width)/2;
                let yOff = 0;
                if (width > this.canvas.width) {
                    width = this.canvas.width;
                    const widthScale = this.canvas.width/g.width;
                    height = g.height*widthScale;
                    xOff = 0;
                    yOff = (this.canvas.height - height)/2;
                }
                ctx.drawImage(g, xOff, yOff, width, height);
                break;
        }
    }
}