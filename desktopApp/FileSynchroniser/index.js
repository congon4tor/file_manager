const { app, BrowserWindow, Menu, MenuItem, ipcMain, globalShortcut } = require('electron');
const fs = require('fs');

let win;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//create browserwindow
let boot = () => {
	win = new BrowserWindow({
		width: 600,
		height: 400,
		frame: false,
		resizable: false
	})
	win.loadURL(`file://${__dirname}/index.html`)
	
	// win.webContents.openDevTools();
}

app.on('ready', boot);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//create right click menu 
// const menu = new Menu();
// menu.append(new MenuItem({ label: 'New Folder', 
// 						   	  click: function(){ alert('hey');} }));
// app.on('ready',function(){
// 	boot();
// 	Menu.setApplicationMenu(menu);
// });

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function stat(path, file) {
	return new Promise(resolve => {
		fs.stat(path + file, (err, stats) => {
			var obj = new Object();
			obj.filename=file;
			//have a distinct id for every file
			obj.theID = `${path}${file}/`;
			obj.isSync=false;
			if (err) throw err;
			if (stats.isDirectory()) {
				obj.isDir = true;
			}
			else {
				//if it is not a directory get some stats more and change the icon
				obj.isDir = false;
				obj.size=stats.size;
				obj.lastModified=stats.mtimeMs;
				obj.creationTime=stats.birthtimeMs;
			}
			resolve(obj);
		});
	});
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function readDirectory(path) {
	return new Promise(resolve => {
		fs.readdir(path, (err, files) => {
			resolve(files);
		});
	});
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
async function readAsync(path) {
	const a = await readDirectory(path);
	return a;
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
async function readEverything(path, files) {
	let obj ;
	var filesObj=[];
	for (let file of files) {
		//for every file call the fs.stat
		obj = await stat(path, file);
		filesObj.push(obj);
	}
	return filesObj;
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//receive request from renderer process  
ipcMain.on('path', async (event, path) => {
	try {
		//first read OS folder 
		readAsync(path).then((files) => {
			//then get stats for all files
			readEverything(path, files).then((jsonObj) => {  win.webContents.send('data', JSON.stringify(jsonObj)) });
		});
	} catch (error) {
		win.webContents.send('data:error', error)
	}
})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////