const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const fs = require('fs');
const request = require('request');
const util = require('util');

//browser window
let win;
//model of file 
let File = require('./src/models/file.js');
//config file with api call strings
let configuration = require('./config/configuration.js');
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Promisify the request get in order to return promise and not pass callback to it 
const get = util.promisify(request.get);
//
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
		path += (process.platform == 'win32' || process.platform == 'win64' ? '\\' : '/');
		//read each file
		fs.stat(path + file, (err, stats) => {
			if (err) {
				reject(new Error('stat():fs.stat():Something went wrong'))
			} else {
				var fileObj;
				if (stats.isDirectory()) {
					fileObj = new File(file, `${path}${file}`, true, true, 0, '', '', 1);
				}
				else {
					//if it is not a directory get some more stats and change the icon
					fileObj = new File(file, `${path}${file}`, false, false, stats.size, stats.mtimeMs, stats.birthtimeMs, 1);
				}
				resolve(fileObj);
			}
		});
	});
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//call api to get server files 
async function getServerFiles() {
	const serverFiles = await get(`${configuration.getServerFilesURL}`);
	return serverFiles;
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//First get all server files. Then iterate through each file in the OS folder to create the view 
async function statFiles(path, localFiles) {
	try {
		var filesDetails = [];
		for (let localFile of localFiles) {
			//for every file call the fs.stat
			let file = await stat(path, localFile);
			//POPULATE THE VERSION FOR EVERY FILE 
			filesDetails.push(file);
		}
		return filesDetails;
	} catch (error) {
		throw new Error('statFiles():' + error);
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
		const dirFiles = await readDirectory(path);
		return dirFiles;
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
		//first we will read the OS folder then we will call the api to get the files from the server and then combine the data and create the view  
		readAsync(path).then((files) => {
			//then get stats for all files
			statFiles(path, files).then((localFiles) => {
				getServerFiles().then((serverFiles) => {
					///////////////////////////////////////////////////////////////////HERE I HAVE BOTH FILES LISTS
					serverFilesArray = JSON.parse(serverFiles.body).files;
					var filesView = [];
					let flag = false;
					for (let serverFile in serverFilesArray) {
						for (let localFile in localFiles) {
							if (serverFilesArray[serverFile].filename === localFiles[localFile].filename) {
								flag = true;
								break;
							}
						}
						if (!flag) {
							fileObj = new File(serverFilesArray[serverFile].filename, serverFilesArray[serverFile].path, false, false, 0, serverFilesArray[serverFile].date, serverFilesArray[serverFile].date, serverFilesArray[serverFile].version);
							filesView.push(fileObj);
						}
						flag = false;
					}
					totalFiles = localFiles.concat(filesView);
					///////////////////////////////////////////////////////////////////
					win.webContents.send('files', JSON.stringify(totalFiles))
				}).catch(function (error) {
					dialog.showMessageBox(win, {
						type: 'error',
						buttons: ['OK'],
						title: 'Error',
						message: 'loadDirectory():getServerFiles():' + error
					});
				});
			}).catch(function (error) {
				dialog.showMessageBox(win, {
					type: 'error',
					buttons: ['OK'],
					title: 'Error',
					message: 'loadDirectory():statFiles():' + error
				});
			});
		}).catch(function (error) {
			dialog.showMessageBox(win, {
				type: 'error',
				buttons: ['OK'],
				title: 'Error',
				message: 'loadDirectory():readAsync():' + error
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
