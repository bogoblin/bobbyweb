// This script will search the DOM for elements with the class "github-code", and replace them with a view of the code
// given by the element's href attribute. <a> elements are recommended.
const lRegex = /^L\d+-L\d+$/;

function codeEl(fileName, href, lines, firstLine=1) {
    const extension = fileName.substr(fileName.lastIndexOf(".")+1);

    const table = document.createElement('table');
    // const head = table.insertRow();
    // head.insertCell()
    // head.insertCell().innerHTML = `<a href=${href} class="hljs-strong" style="font-size: xx-large;color: #cccccc">${fileName}</a>`;

    let currentLine = firstLine;
    for (const line of lines) {
        const row = table.insertRow();
        row.insertCell().innerHTML = `${line}`;
    }

    table.className += " "+extension;

    if (hljs) {
        hljs.highlightElement(table);
    }

    for (let i=0; i<table.rows.length; i++) {
        const row = table.rows.item(i);
        const cell = row.insertCell(0);
        cell.innerHTML = `${currentLine++}`;
        cell.style.textAlign = "right";
    }
    const header = document.createElement('h2');
    header.innerHTML = `<a href=${href} class="github-code-title">${fileName}</a>`;
    const newEl = document.createElement('div');
    const pre = document.createElement('pre');
    pre.appendChild(table);
    newEl.appendChild(header);
    newEl.appendChild(pre);
    newEl.className = "github-code-box";
    return newEl;
}

function githubCode() {
    const els = document.getElementsByClassName("github-code");

    for (let i=0; i<els.length; i++) {
        const e = els.item(i);

        e.innerHTML = "Loading code...";

        let firstLine = 1;
        let lastLine = -1;

        const href = e.getAttribute('href');
        const indexOfHash = href.lastIndexOf('#');

        let hrefWithoutHash;

        if (indexOfHash !== -1) {
            const afterHash = href.substr(indexOfHash + 1);

            const test = lRegex.exec(afterHash);

            if (test) {
                const split = test[0].split(/[L\-]+/);
                firstLine = parseInt(split[1]);
                lastLine = parseInt(split[2]);
            }

            hrefWithoutHash = href.substring(0, indexOfHash);
        }
        else {
            hrefWithoutHash = href;
        }

        const fileName = hrefWithoutHash.substr(hrefWithoutHash.lastIndexOf("/")+1);

        const fileUrl = href.replace("/blob/", "/").replace("github.com", "raw.githubusercontent.com");

        fetch(fileUrl)
            .then((response) => {
                response.text()
                    .then(result => {
                        const lines = result.split(/\n/).slice(firstLine-1, lastLine);

                        const newEl = document.createElement("div");
                        newEl.appendChild(codeEl(fileName, href, lines, firstLine));

                        e.after(newEl);
                        e.remove();
                    })
            })
            .catch(err => {
                console.log(err);
            })
    }
}

window.addEventListener('load', () => {
    githubCode()
});