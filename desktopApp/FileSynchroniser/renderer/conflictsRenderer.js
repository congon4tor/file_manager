const { ipcRenderer } = require('electron');
const remote = require('electron').remote;


let diff2html = require("diff2html").Diff2Html

ipcRenderer.on('diffResult', (event, result) => {
    document.getElementById('html-target-elem').innerHTML = diff2html.getPrettyHtml(
        result,
        { inputFormat: 'diff', showFiles: true, matching: 'lines', outputFormat: 'side-by-side' }
    );
})


function closeConflictsWindow() {
    var window = remote.getCurrentWindow();
    window.close();
}