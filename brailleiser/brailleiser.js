// scale image
// convert to grayscale
// threshold the image
// convert to braille

function loadAndScale(scaledWidth, heightScaleFactor) {
    // loads an image from the preview-image file upload
    // and returns the image data
    const img = document.getElementById('preview-image');
    const canvas = document.getElementById('canvas');

    let scaledHeight = heightScaleFactor*scaledWidth*img.height/img.width;
    scaledHeight -= scaledHeight%4; // Make sure that it's a multiple of 4 for our braille algorithm
    const [w, h] = [scaledWidth, scaledHeight];
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    return ctx.getImageData(0, 0, w, h);
}

const getChannel = (imageData, index, channel) => imageData.data[index*4 + channel];

const dist = (c1, c2) => {
    return Math.sqrt(
        Math.pow(c1[0]-c2[0], 2) +
        Math.pow(c1[1]-c2[1], 2) +
        Math.pow(c1[2]-c2[2], 2)
    );
}

function cluster(imageData, nClusters) {
    const [w, h] = [imageData.width, imageData.height];
    const getPixel = (x, y) => [0, 1, 2].map(c => getChannel(imageData, y*w + x, c));
    
    let clusters = [];
    let oldClusters = [];
    for (let i=0; i<nClusters; i++) {
        clusters.push(getPixel(Math.floor(Math.random()*w), Math.floor(Math.random()*h)));
        oldClusters.push(clusters[i]);
        
    }

    let clustersChanged = true;
    while (clustersChanged) {
        let clusterPop = [];
        let clusterTotals = [];
        for (let i=0; i<nClusters; i++) {
            oldClusters[i] = clusters[i];
            clusterPop.push(0);
            clusterTotals.push([0, 0, 0]);
        }
        for (let x=0; x<w; x++) {
            for (let y=0; y<h; y++) {
                let color = getPixel(x, y);
                let minDist = Infinity;
                let minDistIndex = 0;
                for (let i=0; i<nClusters; i++) {
                    if (dist(color, clusters[i]) < minDist) {
                        minDist = dist(color, clusters[i]);
                        minDistIndex = i;
                    }
                }
                let i=minDistIndex;
                [0, 1, 2].forEach(n => clusterTotals[i][n]+=color[n]);
                clusterPop[i]++;
            }
        }
        clustersChanged = false;
        for (let i=0; i<nClusters; i++) {
            if (dist(oldClusters[i], clusters[i]) > 0) {
                clustersChanged = true;
                break;
            }
        }
    }
    return clusters.sort((a, b) => {
        return (a[0]*0.3 + a[1]*0.59 + a[2]*0.11) - (b[0]*0.3 + b[1]*0.59 + b[2]*0.11)
    });
}

function grayscale(imageData, method) {
    // returns an object containing UInt8ClampedArray representing the old imageData but in grayscale
    const grayImage = new Uint8ClampedArray(imageData.width*imageData.height);
    const [w, h] = [imageData.width, imageData.height];
    const getPixel = (x, y) => [0, 1, 2].map(c => getChannel(imageData, y*w + x, c));
    let index = 0;
    let clusters;
    if (method == "Cluster") {
        clusters = cluster(imageData, 8);
        clusterGSValues = [0,1,2,3,4,5,6,7].map(n => Math.round(n*(255/7)));
    }
    for (let y=0; y<imageData.height; y++) {
        for (let x=0; x<imageData.width; x++) {
            index++;
            let value
            switch(method) {
              default:
                case "Minimum":
                value = 255;
                [0, 1, 2].forEach(c => value = Math.min(value, getChannel(imageData, index, c)));
                grayImage[index] = value;
                break;

                case "Maximum":
                value = 0;
                [0, 1, 2].forEach(c => value = Math.max(value, getChannel(imageData, index, c)));
                grayImage[index] = value;
                break;

                case "Average":
                value = 0;
                [0, 1, 2].forEach(c => value += getChannel(imageData, index, c));
                grayImage[index] = Math.round(value/3);
                break;

                case "Luma":
                value = 0;
                value += getChannel(imageData, index, 0)*0.3;
                value += getChannel(imageData, index, 1)*0.59;
                value += getChannel(imageData, index, 2)*0.11;
                grayImage[index] = value;
                break;

                case "Red":
                grayImage[index] = getChannel(imageData, index, 0);
                break;
                case "Green":
                grayImage[index] = getChannel(imageData, index, 1);
                break;
                case "Blue":
                grayImage[index] = getChannel(imageData, index, 2);
                break;

                case "Cluster":
                let nearestClusterDist = Infinity;
                let nearestClusterIndex = 0;
                const color = getPixel(x, y);
                for (let i=0; i<clusters.length; i++) {
                    let thisDist = dist(color, clusters[i]);
                    if (thisDist < nearestClusterDist) {
                        nearestClusterDist = thisDist;
                        nearestClusterIndex = i;
                    }
                }
                grayImage[index] = clusterGSValues[nearestClusterIndex];
                break;
            }
        }
    }
    return {
        width: imageData.width,
        height: imageData.height,
        data: grayImage
    };
}

function getMinAndMax(grayImageData) {
    let total = grayImageData.width*grayImageData.height;
    let min = 255;
    let max = 0;
    for (let index=0; index<total; index++) {
        const value = grayImageData.data[index];
        if (value > max) max = value;
        if (value < min) min = value;
    }
    return [min, max];
}

function minMaxScaledImage(grayImageData) {
    const [min, max] = getMinAndMax(grayImageData);
    const grayImage = new Uint8ClampedArray(grayImageData.width*grayImageData.height);
    let total = grayImageData.width*grayImageData.height;
    for (let index=0; index<total; index++) {
        const value = grayImageData.data[index];
        const scaledValue = Math.floor((value - min) * (255/(max-min)));
        if (scaledValue < 0) scaledValue = 0;
        if (scaledValue > 255) scaledValue = 255;
        grayImage[index] = scaledValue;
    }
    return {
        width: grayImageData.width,
        height: grayImageData.height,
        data: grayImage
    };
}

const bayer = 
    [[ 34, 190, 105, 209,  61, 195, 115, 214 ],
    [ 227, 141, 242, 168, 231, 148, 246, 174 ],
    [ 124, 218,  79, 200, 133, 223,  93, 205 ],
    [ 250, 179, 235, 155, 253, 185, 239, 162 ],
    [  71, 198, 120, 216,  49, 193, 110, 212 ],
    [ 233, 152, 248, 177, 229, 145, 244, 171 ],
    [ 137, 225,  99, 207, 129, 220,  86, 202 ],
    [ 255, 188, 240, 165, 251, 182, 237, 158 ]];

const br = [0x1, 0x2, 0x4, 0x40, 0x8, 0x10, 0x20, 0x80];

function createBraille(scaledWidth) {
    const imageData = loadAndScale(scaledWidth, 142/116);
    const grayImageData = grayscale(imageData, document.getElementById("method").value);
    const scaledImageData = minMaxScaledImage(grayImageData);
    const [w, h] = [imageData.width, imageData.height];
    let output = [];

    for (let y=0; y<h; y+=4) {
        for (let x=0; x<w; x+=2) {
            let char = 0x2800;
            let darkest = 255;
            let darkestB = 0;
            for (let b=0; b<8; b++) {
                const px = x+Math.floor(b/4); const py = y+b%4;
                const threshold = bayer[px%8][py%8];
                const i = py*w + px;
                let value = scaledImageData.data[i];
                if (invert) value = 255 - value;

                if (value > darkest) {
                    darkest = value;
                    darkestB = b;
                }

                if (value < threshold) {
                    char += br[b];
                }
            }
            if (char == 0x2800) {
                char += br[darkestB];
            }
            output.push(String.fromCharCode(char));
        }
        output.push("\n");
    }
    return {
        rows: h,
        cols: w,
        data: output.join("")
    };
}