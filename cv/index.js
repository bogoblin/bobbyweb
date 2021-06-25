const md = require('markdown-it');
const fs = require('fs');

const header = fs.readFileSync('./header.html').toString();
const footer = fs.readFileSync('./footer.html').toString();
const cvmd = fs.readFileSync('./cv.md').toString();
const cvhtml = new md({html: true}).render(cvmd);
let output = header + cvhtml + footer;

fs.writeFileSync('./index.html', output);


