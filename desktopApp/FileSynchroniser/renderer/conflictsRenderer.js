const { ipcRenderer } = require('electron');

let diff2html = require("diff2html").Diff2Html

ipcRenderer.on('diffResult', (event, result) => {
    document.getElementById('html-target-elem').innerHTML = diff2html.getPrettyHtml(
        result,
        { inputFormat: 'diff', showFiles: true, matching: 'lines', outputFormat: 'side-by-side' }
    );
})