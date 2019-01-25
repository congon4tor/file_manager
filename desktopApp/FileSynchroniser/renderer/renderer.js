const { ipcRenderer } = require('electron');
const { shell } = require('electron');

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function readFolder() {
    //get the path from the input file button
    var path = document.getElementById("syncDirectory").files[0].path+'\\';
    //call main process to get files 
    ipcRenderer.send('path', path);
    //receive files from main process to renderer
    ipcRenderer.on('data', (event, data) => {
        document.getElementById('display-files').innerHTML = `${JSON.parse(data).map(fileTemplate).join("")}`; 
    })
    //if error console log it
    ipcRenderer.on('data:error', (event, data) => {
        console.log('ERROR');
    })
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function openFile(path) {
    //open any file with default OS program 
    shell.openItem(path);
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
function fileTemplate(data) {
    let string = ``;
    if (data.isDir)
        string = `<li id=${data.theID} ondblclick="readFolder(this.id)"><i class="fa fa-folder-open"></i> ${data.filename}</li><br/>`;
    else
        string = `<li id=${data.theID} onclick="updateDetails(${data.size},${data.filename})" ondblclick="openFile(this.id)" style="display:inline-block;"><i class="fa fa-file"></i> ${data.filename} 
        ${data.isSync ? `<i class="fas fa-check"></i>` : `<i class="fas fa-times"></i>`}</li> 
        <li style="display:inline-block;"><i class="fas fa-sync"></i></li><br/>`;
    return string;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
function updateDetails(size,fileName){
    document.getElementById('size').innerHTML = size;
    document.getElementById('fileName').innerHTML = fileName;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////// 
