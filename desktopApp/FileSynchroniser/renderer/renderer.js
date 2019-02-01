const { ipcRenderer } = require('electron');
const storage = require('electron-json-storage');

// hide warning regarding Content Security Policy https://developer.chrome.com/extensions/contentSecurityPolicy
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//get the files from main process when user clicks load directory
ipcRenderer.on('files', (event, files) => {
    document.getElementById('display-files-header').innerHTML =
        `<tr>
            <th></th>
            <th></th>
            <th>Filename</th>
            <th>Size</th>
            <th></th>
        </tr>`;
    document.getElementById('display-files').innerHTML = `${JSON.parse(files).map(fileTemplate).join("")}`;
})
//if error console log it
ipcRenderer.on('files:error', (event, data) => {
    console.log('ERROR');
})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function openFile(path) {
    ipcRenderer.send('openFile', path);
    ipcRenderer.on('openFile', (event, success) => {
        console.log('ok');
    })
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
function fileTemplate(data) {
    let string = ``;
    if (data.isDir)
        string =
            `<tr id="${data.theID}">
                <td ondblclick="synchronizeFile(this.parentNode.id)"><i class="fas fa-sync"></td>
                <td id="${data.theID}status">${data.isSync ? `<i style="color:green" class="fas fa-check"></i>` : `<i style="color:red" class="fas fa-times"></i>`}</td>
                <td ondblclick="readFolder(this.id)"><i class="fa fa-folder-open"></i> ${data.filename}</td>
                <td></td>
                <td></td>
            </tr>`
    else
        string =
            `<tr id="${data.theID}">
                ${data.isSync == 2 ? `<td id="${data.filename}" ondblclick="downloadFile(this.id)"><i class="fas fa-download"></i></td>` :
                data.isSync == 1 ? `<td></td>` : data.isSync == 3 ? `<td id="${data.filename}" ondblclick="synchronizeFile(this.parentNode.id, this.id)"><i class="fas fa-screwdriver"></i></td>` : `<td id="${data.filename}" ondblclick="synchronizeFile(this.parentNode.id, this.id)"><i class="fas fa-upload"></i></td>`}               
                <td id="${data.theID}status">${data.isSync == 1 ? ` <i style="color:green" class="fas fa-check"></i>` :
                data.isSync == 2 ? `<i style="color:blue" class="fas fa-cloud"></i>` :
                    data.isSync == 3 ? `<i style="color:red" class="fas fa-times"></i>` : `<i style="color:grey" class="fas fa-laptop"></i>`}</td>
                <td ondblclick="openFile(this.parentNode.id)"><i class="fa fa-file"></i> ${data.filename}</td>
                <td> ${data.size} MB</td>
                <td id="${data.theID}lastSync"></td>
                </tr>`;
    return string;
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
function downloadFile(filename) {
    ipcRenderer.send('downloadFile', filename);
}

ipcRenderer.on('downloadFileResult:error', (event, result) => {
    console.log('hey this is an error')
})

ipcRenderer.on('downloadFileResult', (event, result) => {
    refreshScreen();
    alert();
})

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function synchronizeFile(path, filename) {
    ipcRenderer.send('synchronizeFile', path, filename);
    //receive result from file synchronization from main process to renderer
    ipcRenderer.on('synchronizeFileResult', (event, result) => {
        var myObj = JSON.parse(result);
        document.getElementById(`${myObj.theID}status`).innerHTML = `<i style="color:green" class="fas fa-check"></i>`;
        document.getElementById(`${myObj.theID}lastSync`).innerHTML = `${myObj.file.date}`;
        alert();
    })
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function refreshScreen() {
    ipcRenderer.send('refreshScreen', 'refresh');
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function alert() {
    $(".alert-bottom").show();
    setTimeout(function () {
        $(".alert-bottom").hide();
    }, 6000);
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

