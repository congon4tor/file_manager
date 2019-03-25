const { ipcRenderer } = require('electron');

let File = require('../models/file.js');
// hide warning regarding Content Security Policy https://developer.chrome.com/extensions/contentSecurityPolicy
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

//get the files from main process when user clicks load directory
ipcRenderer.on('files', (event, files) => {
    document.getElementById('display-files').innerHTML = `${JSON.parse(files).map(fileTemplate).join("")}`;
    //if there are no rows do not show header
    if (document.getElementById('display-files').innerHTML != '') {
        document.getElementById('display-files-header').innerHTML =
            `<tr>
                <th></th>
                <th></th>
                <th>Filename</th>
                <th>Size</th>
                <th></th>
                <th></th>
            </tr>`;
    } else {
        document.getElementById('display-files-header').innerHTML = ''
    }
    $('[data-toggle="tooltip"]').tooltip();
    hideLoader()
})
//if error hide loader 
ipcRenderer.on('files:Error', (event, data) => {
    $(".tooltip").tooltip("hide");
    hideLoader()
})

function openFile(index) {
    $(".tooltip").tooltip("hide");
    showLoader()
    ipcRenderer.send('openFile', index);
    ipcRenderer.on('openFile', (event, success) => {
        hideLoader()
    })
}

function fileTemplate(data) {
    let string =
        `<tr id="${data.index}">
            <td id="${data.filename}" ondblclick="${data.isSync == File.SERVER_ONLY ? `downloadFile(this.id)` :
            (data.isSync == File.DIFFERENT_VERSION || (data.isSync == File.LOCAL_ONLY || (data.isSync == File.SAME_VERSION && data.differentContent))) ? `synchronizeFile(this.parentNode.id, this.id)`
                : ``}">
                ${data.isSync == File.SERVER_ONLY ? `<i data-toggle="tooltip" data-placement="right" title="Double click to download file" class="fas fa-download"></i>` :
            data.isSync == File.DIFFERENT_VERSION ? `<i data-toggle="tooltip" data-placement="right" title="Double click to fix file" class="fas fa-screwdriver"></i>` :
                (data.isSync == File.LOCAL_ONLY || (data.isSync == File.SAME_VERSION && data.differentContent)) ? `<i data-toggle="tooltip" data-placement="right" title="Double click to upload the file" class="fas fa-upload"></i>`
                    : `<i data-toggle="tooltip" data-placement="right" title="No action" class="far fa-check-circle"></i>`}
            </td>
            <td id="${data.index}status">
                ${ ((data.isSync == File.DIFFERENT_VERSION || data.differentContent) ||
            (data.isSync == File.SAME_VERSION && data.differentContent)) ? `<i data-toggle="tooltip" data-placement="right" title="File has different content on server" style="color:red" class="fas fa-times"></i>` :
            (data.isSync == File.SAME_VERSION && !data.differentContent) ? `<i data-toggle="tooltip" data-placement="right" title="File is up to date" style="color:green" class="fas fa-check"></i>` :
                data.isSync == File.SERVER_ONLY ? `<i data-toggle="tooltip" data-placement="right" title="File is only on the server" style="color:blue" class="fas fa-cloud"></i>` :
                    `<i data-toggle="tooltip" data-placement="right" title="File is only locally" style="color:grey" class="fas fa-laptop"></i>`}
            </td >
    <td data-toggle="tooltip" data-placement="top" title="Double click to open file" ondblclick="openFile(this.parentNode.id)"><i class="fa fa-file"></i> ${data.filename}</td>
    <td> ${data.size} MB</td>
    <td id="${data.index}lastSync"></td>
    <td ondblclick="deleteFile(this.parentNode.id)"><i data-toggle="tooltip" data-placement="top" title="Double click to delete file" style="color:red" class="fas fa-trash-alt"></i></td>
        </tr > `;
    return string;
}

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
        alert(result, 'deleted', 'alert-success')
})

function downloadFile(filename) {
    $(".tooltip").tooltip("hide");
    showLoader()
    ipcRenderer.send('downloadFile', filename);
}
ipcRenderer.on('downloadFileResult:Error', (event, result) => {
    hideLoader()
    alert('<i class="fas fa-exclamation-triangle"></i> Oops! Error '+result, '', 'alert-danger')
})
ipcRenderer.on('downloadFileResult', (event, result) => {
    hideLoader()
    refreshScreen()
    $('[data-toggle="tooltip"]').tooltip();
    alert(result, 'downloaded', 'alert-success')
})

ipcRenderer.on('closedConflicts', (event, result) => {
    hideLoader()
})

ipcRenderer.on('refreshLoader', (event, result) => {
    showLoader()
})

ipcRenderer.on('loginLoader', (event, result) => {
    showLoader()
})

ipcRenderer.on('Error', (event, result) => {
    hideLoader()
    alert('<i class="fas fa-exclamation-triangle"></i> Oops!'+result, '', 'alert-danger')
})

function synchronizeFile(index, filename) {
    $(".tooltip").tooltip("hide");
    showLoader()
    ipcRenderer.send('synchronizeFile', index, filename);
    //receive result from file synchronization from main process to renderer
    ipcRenderer.on('synchronizeFileResult', (event, result) => {
        var myObj = JSON.parse(result);
        document.getElementById(`${myObj.file.filename}`).innerHTML = `<i data-toggle="tooltip" data-placement="right" title="No action" class="far fa-check-circle"></i>`;
        document.getElementById(`${myObj.index}status`).innerHTML = `<i style = "color:green" class="fas fa-check"></i>`;
        document.getElementById(`${myObj.index}lastSync`).innerHTML = ``;
        hideLoader()
        alert(myObj.file.filename, 'uploaded', 'alert-success')
    })
    ipcRenderer.on('synchronizeFileResult:Error', (event, result) => {
        hideLoader()
    })
}

function refreshScreen() {
    $(".tooltip").tooltip("hide");
    showLoader()
    ipcRenderer.send('refreshScreen', 'refresh');
}

function logout() {
    showLoader()
    ipcRenderer.send('logout');
}

function alert(message, action, styleClass) {
    document.getElementById("alert-div").classList.add(styleClass);
    if (styleClass === 'alert-success') {
        if (message != "") {
            document.getElementById("alert-message").innerHTML = "Success! File " + message + " just " + action + "!";
        }
    }else{
        document.getElementById("alert-message").innerHTML = "" + message;
    }
    $(".alert-bottom").show();
    setTimeout(function () {
        $(".alert-bottom").hide();
    }, 6000);
}

function showLoader() {
    document.getElementById("loader").style.display = "block";
}

function hideLoader() {
    document.getElementById("loader").style.display = "none";
}

ipcRenderer.on('deleteAccount:error', (event, result) => {
    alert(result, '', 'alert-danger')
})

ipcRenderer.on('unauthorized', (event, result) => {
    alert('<i class="fas fa-exclamation-triangle"></i> Oops! Seems you\'re unauthorized. Please try logging in again', '', 'alert-danger')
})

ipcRenderer.on('files:Error', (event, data) => {
    alert('<i class="fas fa-exclamation-triangle"></i>'+data, '', 'alert-danger')
    hideLoader()
})
