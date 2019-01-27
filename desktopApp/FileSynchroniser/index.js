const { app, BrowserWindow, Menu, MenuItem, dialog, ipcMain, globalShortcut } = require('electron');
const fs = require('fs');
const request = require('request');

let win;
let File = require('./src/models/file.js');
let configuration = require('./config/configuration.js');

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//create browserwindow
let boot = () => {
	win = new BrowserWindow({
		width: 1200,
		height: 1200,
		frame: true,
		resizable: true,
		icon: `${__dirname}/src/img/icon.png`,
		webPreferences: {
			//for the warning it gives on console. Security issue (?)
			nodeIntegration: true
		}
	})
	win.loadURL(`file://${__dirname}/index.html`)
	// win.webContents.openDevTools();
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var menu = Menu.buildFromTemplate([
	{
		label: 'File',
		submenu: [
			{
				label: 'Load directory',
				accelerator: 'CmdOrCtrl+O',
				click() {
					dialog.showOpenDialog({
						properties: ['openDirectory']
					}, function (files) {
						if (files) {
							loadDirectory(files[0])
						}
					})
				}
			},
			{ type: 'separator' },
			{
				label: 'Exit',
				click() {
					app.quit()
				}
			}
		]
	},
])
Menu.setApplicationMenu(menu);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.on('ready', boot);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//get info on each file
function stat(path, file) {
	return new Promise((resolve, reject) => {
		//determine what OS is running on to add back or slash
		path += (process.platform == 'darwin' ? '/' : '\\');
		//read each file
		fs.stat(path + file, (err, stats) => {
			if (err) {
				reject(new Error('stat():fs.stat():Something went wrong'))
			} else {
				var fileObj;
				if (stats.isDirectory()) {
					fileObj = new File(file, `${path}${file}`, true, true, 0, '', '', 0);
				}
				else {
					//if it is not a directory get some stats more and change the icon
					fileObj = new File(file, `${path}${file}`, false, false, stats.size, stats.mtimeMs, stats.birthtimeMs, 0);
				}
				resolve(fileObj);
			}
		});
	});
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//First get all server files. Then iterate through each file in the OS folder to create the view 
async function readEverything(path, localFiles) {
	try {
		//first get all server files in order to combine and show all relevant info 
		request.get(`${configuration.getServerFilesURL}`,
			//this will run when we get all server files. 
			async function (error, response, body) {
				if (!error && response.statusCode == 200) {
					var jsonObj = JSON.parse(body);
					let serverFiles = jsonObj.files;
					////////////////////////////////////////////////////MISSING LOGIC HERE
					//now we have all 'serverFiles' from server and all 'localFiles' from OS foler so we can create the view to show 
					var filesView = [];
					for (let localFile of localFiles) {
						//for every file call the fs.stat
						let file = await stat(path, localFile);
						//POPULATE THE VERSION FOR EVERY FILE 
						file.setVersion(1);
						filesView.push(file);
					}
					//return the files array to show on screen!!
					return filesView;
					/////////////////////////////////////////////////////
				}
				if (error) {
					//this is the error from the api call 
					dialog.showMessageBox(win, {
						type: 'error',
						buttons: ['OK'],
						title: 'Error',
						message: 'readEverything():Error while reading server files:' + (!error ? response.statusCode : '') + ' ' + error
					});
				}
			}
		);
	} catch (error) {
		//this is the error from the callback function
		throw new Error('readEverything():' + error);
	}
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//read directory to get files 
function readDirectory(path) {
	return new Promise((resolve, reject) => {
		fs.readdir(path, (err, files) => {
			if (err) {
				reject(new Error('readDirectory():fs.readdir():Something went wrong'))
			} else {
				resolve(files);
			}
		});
	});
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//read the directory
async function readAsync(path) {
	try {
		const a = await readDirectory(path);
		return a;
	} catch (error) {
		dialog.showMessageBox(win, {
			type: 'error',
			buttons: ['OK'],
			title: 'Error',
			message: 'readAsync():' + error
		});
	}
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//deal with load file directory menu option
function loadDirectory(path) {
	try {
		//first we will call the api to get the files from the server, then we will read the OS folder to combine the data and create the view  
		readAsync(path).then((files) => {
			//then get stats for all files
			readEverything(path, files).then((jsonObj) => { win.webContents.send('files', JSON.stringify(jsonObj)) }).catch(function (error) {
				dialog.showMessageBox(win, {
					type: 'error',
					buttons: ['OK'],
					title: 'Error',
					message: 'rendererOnPath():readEverything():' + error
				});
			});
		}).catch(function (error) {
			dialog.showMessageBox(win, {
				type: 'error',
				buttons: ['OK'],
				title: 'Error',
				message: 'rendererOnPath():readAsync():' + error
			});
		});
	} catch (error) {
		win.webContents.send('files:error', error)
	}
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//call the backend service to syncronize a file
ipcMain.on('synchronizeFile', async (event, path) => {
	try {
		const formData = {
			version: 1,
			file: fs.createReadStream(path),
		}
		request.post(`${configuration.syncFileURL}`,
			{
				formData: formData
			},
			function (error, response, body) {
				if (!error && response.statusCode == 200) {
					var obj = JSON.parse(body);
					obj.theID = path;
					win.webContents.send('synchronizeFileResult', JSON.stringify(obj))
				}
				if (error) {
					dialog.showMessageBox(win, {
						type: 'error',
						buttons: ['OK'],
						title: 'Error',
						message: 'synchronizeFile():' + (!error ? response.statusCode : '') + ' ' + error
					});
				}
			}
		);
	} catch (error) {
		dialog.showMessageBox(win, {
			type: 'error',
			buttons: ['OK'],
			title: 'Error',
			message: 'synchronizeFile():Error while reading the file!'
		});
		win.webContents.send('synchronizeFileResult:error', error)
	}
})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
