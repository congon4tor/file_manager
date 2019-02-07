const { ipcRenderer } = require('electron');
const storage = require('electron-json-storage');

// hide warning regarding Content Security Policy https://developer.chrome.com/extensions/contentSecurityPolicy
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//get the files from main process when user clicks load directory
ipcRenderer.on('files', (event, files) => {
    $(".tooltip").tooltip("hide");
    document.getElementById('display-files-header').innerHTML =
        `<tr>
            <th></th>
            <th></th>
            <th>Filename</th>
            <th>Size</th>
            <th></th>
            <th></th>
        </tr>`;
    document.getElementById('display-files').innerHTML = `${JSON.parse(files).map(fileTemplate).join("")}`;
    $('[data-toggle="tooltip"]').tooltip();
    hideLoader()
})
//if error hide loader 
ipcRenderer.on('files:Error', (event, data) => {
    $(".tooltip").tooltip("hide");
    hideLoader()
})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function openFile(index) {
    $(".tooltip").tooltip("hide");
    showLoader()
    ipcRenderer.send('openFile', index);
    ipcRenderer.on('openFile', (event, success) => {
        hideLoader()
    })
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
function fileTemplate(data) {
    let string = ``;
    if (data.isDir)
        string =
            `<tr id="${data.index}">
                <td></td>
                <td id="${data.index}status">${data.isSync ? `<i style="color:green" class="fas fa-check"></i>` : `<i style="color:red" class="fas fa-times"></i>`}</td>
                <td ondblclick="readFolder(this.id)"><i class="fa fa-folder-open"></i> ${data.filename}</td>
                <td></td>
                <td></td>
                <td></td>
            </tr>`
    else
        string =
            `<tr id="${data.index}">
                <td id="${data.filename}" ondblclick="${data.isSync == 2 ? `downloadFile(this.id)` : data.isSync == 1 ? `` : `synchronizeFile(this.parentNode.id, this.id)`}">
            ${data.isSync == 2 ? `<i data-toggle="tooltip" data-placement="top" title="Double click to download file" class="fas fa-download"></i>` :
                data.isSync == 1 ? ` ` :
                    data.isSync == 3 ? `<i data-toggle="tooltip" data-placement="top" title="Double click to fix file" class="fas fa-screwdriver"></i>` :
                        `<i data-toggle="tooltip" data-placement="top" title="Double click to upload the file" class="fas fa-upload"></i>`}
                </td>
                <td id="${data.index}status">
            ${data.isSync == 1 ? `<i style="color:green" class="fas fa-check"></i>` :
                data.isSync == 2 ? `<i style="color:blue" class="fas fa-cloud"></i>` :
                    data.isSync == 3 ? `<i style="color:red" class="fas fa-times"></i>` :
                        `<i style="color:grey" class="fas fa-laptop"></i>`}
                </td>
                <td data-toggle="tooltip" data-placement="top" title="Double click to open file" ondblclick="openFile(this.parentNode.id)"><i class="fa fa-file"></i> ${data.filename}</td>
                <td> ${data.size} MB</td>
                <td id="${data.index}lastSync"></td>
                <td ondblclick="deleteFile(this.parentNode.id)"><i data-toggle="tooltip" data-placement="top" title="Double click to delete file" style="color:red" class="fas fa-trash-alt"></i></td>
            </tr>`;
    return string;
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
function deleteFile(filename) {
    $(".tooltip").tooltip("hide");
    showLoader()
    ipcRenderer.send('deleteFile', filename);
}
ipcRenderer.on('deleteFileResult:Error', (event, result) => {
    hideLoader()
})
ipcRenderer.on('deleteFileResult', (event, result) => {
    hideLoader()
    refreshScreen()
    $('[data-toggle="tooltip"]').tooltip();
    if (result != '')
        alert(result, 'deleted')
})
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
function downloadFile(filename) {
    $(".tooltip").tooltip("hide");
    showLoader()
    ipcRenderer.send('downloadFile', filename);
}
ipcRenderer.on('downloadFileResult:Error', (event, result) => {
    hideLoader()
})
ipcRenderer.on('downloadFileResult', (event, result) => {
    hideLoader()
    refreshScreen()
    $('[data-toggle="tooltip"]').tooltip();
    alert(result, 'downloaded')
})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function synchronizeFile(index, filename) {
    $(".tooltip").tooltip("hide");
    showLoader()
    ipcRenderer.send('synchronizeFile', index, filename);
    //receive result from file synchronization from main process to renderer
    ipcRenderer.on('synchronizeFileResult', (event, result) => {
        var myObj = JSON.parse(result);
        document.getElementById(`${myObj.file.filename}`).innerHTML = ``;
        document.getElementById(`${myObj.index}status`).innerHTML = `<i style="color:green" class="fas fa-check"></i>`;
        document.getElementById(`${myObj.index}lastSync`).innerHTML = ``;
        hideLoader()
        alert(myObj.file.filename,'uploaded')
    })
    ipcRenderer.on('synchronizeFileResult:Error', (event, result) => {
        hideLoader()
    })
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function refreshScreen() {
    showLoader()
    ipcRenderer.send('refreshScreen', 'refresh');
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function alert(message,action) {
    if (message != "")
        document.getElementById("alert-message").innerHTML = "Success! File " + message + " just " + action + "!";
    $(".alert-bottom").show();
    setTimeout(function () {
        $(".alert-bottom").hide();
    }, 6000);
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function showLoader() {
    document.getElementById("loader").style.display = "block";
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function hideLoader() {
    document.getElementById("loader").style.display = "none";
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
