const { ipcRenderer } = require('electron');
const { shell } = require('electron');

// hide warning regarding Content Security Policy https://developer.chrome.com/extensions/contentSecurityPolicy
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//get the files from main process when user clicks load directory
ipcRenderer.on('files', (event, files) => {
    document.getElementById('display-files').innerHTML = `${JSON.parse(files).map(fileTemplate).join("")}`;
})
//if error console log it
ipcRenderer.on('files:error', (event, data) => {
    console.log('ERROR');
})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function openFile(path) {
    //open any file with default OS program 
    shell.openItem(path);
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
                data.isSync == 1 ? `<td></td>` : `<td id="${data.filename}" ondblclick="synchronizeFile(this.parentNode.id, this.id)"><i class="fas fa-sync"></td>`}               
                <td id="${data.theID}status">${data.isSync == 1 ? ` <i style="color:green" class="fas fa-check"></i>` :
                data.isSync == 2 ? `<i style="color:blue" class="fas fa-cloud"></i>` :
                    data.isSync == 3 ? `<i style="color:red" class="fas fa-times"></i>` : `<i style="color:grey" class="fas fa-laptop"></i>`}</td>
                <td ondblclick="openFile(this.parentNode.id)"><i class="fa fa-file"></i> ${data.filename}</td>
                <td> ${data.size}</td>
                <td id="${data.theID}lastSync"></td>
                </tr>`;
    return string;
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
function downloadFile(filename) {
    ipcRenderer.send('downloadFile', filename);
    //receive result from file download from main process to renderer
    ipcRenderer.on('downloadFileResult', (event, result) => {
        storage.get('path', function (error, data) {
            if (error) throw error;
            document.getElementById(`${data.path}${filename}status`).innerHTML = `<i style="color:green" class="fas fa-check"></i>`;
            document.getElementById(`${data.path}${filename}lastSync`).innerHTML = ``;
        })
    })
    ipcRenderer.on('downloadFileResult:error', (event, data) => {
        document.getElementById('failure-alert').innerHTML = `<h3>Error:${data}</h3>`;
    })
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function synchronizeFile(path, filename) {
    ipcRenderer.send('synchronizeFile', path, filename);
    //receive result from file synchronization from main process to renderer
    ipcRenderer.on('synchronizeFileResult', (event, result) => {
        var myObj = JSON.parse(result);
        document.getElementById(`${myObj.theID}status`).innerHTML = `<i style="color:green" class="fas fa-check"></i>`;
        document.getElementById(`${myObj.theID}lastSync`).innerHTML = `${myObj.file.date}`;
        document.getElementById('success-alert').innerHTML = `<h3>Success!</h3>`;
        //use some jquery to show hide alert
        $("#success-alert").fadeIn(1000);
        $("#success-alert").fadeTo(6000, 500).slideUp(500, function () {
            $("#success-alert").slideUp(500);
        });
    })
    ipcRenderer.on('synchronizeFileResult:error', (event, data) => {
        document.getElementById('failure-alert').innerHTML = `<h3>Error:${data}</h3>`;
        //use some jquery to show hide alert
        $("#failure-alert").fadeIn(1000);
        $("#failure-alert").fadeTo(6000, 500).slideUp(500, function () {
            $("#failure-alert").slideUp(500);
        });
    })
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////