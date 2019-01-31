const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const fs = require('fs');
const request = require('request');
const util = require('util');
const { shell } = require('electron');

const storage = require('electron-json-storage');
//const dataPath = storage.getDataPath();

//keep for changing it to temp folder if it doesn't work on linux/os
//const os = require('os');
//storage.setDataPath(os.tmpdir());

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
function boot() {
	win = new BrowserWindow({
		width: 1200,
		height: 700,
		frame: true,
		resizable: true,
		icon: `${__dirname}/src/img/icon.png`,
		webPreferences: {
			//for the warning it gives on console. Security issue (?)
			nodeIntegration: true
		}
	})
	win.loadURL(`file://${__dirname}/index.html`)
	win.webContents.openDevTools();
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
					loadDirectoryMenuOption()
				}
			},
			{
				label: 'Refresh',
				accelerator: 'CmdOrCtrl+R',
				click() {
					refreshScreen()
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

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.on('ready', () => {
	Menu.setApplicationMenu(menu);
	boot();
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function loadDirectoryMenuOption() {
	dialog.showOpenDialog({
		properties: ['openDirectory']
	}, function (files) {
		if (files) {
			storage.set('path', { path: files[0] + (process.platform == 'win32' || process.platform == 'win64' ? '\\' : '/') }, function (error) {
				if (error) throw error;
			});
			loadDirectory(files[0])
		}
	})
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function refreshScreen() {
	try {
		storage.has('path', function (error, hasKey) {
			if (error) throw error;
			if (hasKey) {
				storage.get('path', function (error, data) {
					if (error) throw new Error('refreshScreen():Error getting storage');
					loadDirectory(data.path)
				})
			} else {
				loadDirectoryMenuOption()
			}
		});
	} catch (error) {
		showMessageBox('error', 'Error', error);
	}
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
ipcMain.on('refreshScreen', async (event) => {
	refreshScreen()
})
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
				let fileObj;
				if (stats.isDirectory()) {
					fileObj = new File(file, `${path}${file}`, true, true, 0, '', '', 1);
				}
				else {
					//if it is not a directory get some more stats and change the icon IS SYNC ON BEGIN IS 0 (FILE EXISTS ON DESKTOP) FOR EVERY FILE
					fileObj = new File(file, `${path}${file}`, 0, false, (stats.size / 1024).toFixed(1), stats.mtimeMs, stats.birthtimeMs, 1);
					storage.set(file, { filename: file, version: 1 }, function (error) {
						if (error) throw new Error('Error updating storage');
						reject(error);
					});
				}
				resolve(fileObj);
			}
		});
	});
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//check if file exists or not!
function checkExistence(path) {
	return fs.existsSync(path) ? true : false;
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
ipcMain.on('openFile', async (event, path) => {
	try {
		let exists = checkExistence(path);
		if (!exists) {
			showMessageBox('warning', 'Warning', 'File does not exist. You have to download it first.');
		} else {
			shell.openItem(path)
		}
		win.webContents.send('openFile', exists)
	} catch (error) {
		showMessageBox('error', 'Error', 'checkExistence():fs.existsSync():' + error);
	}
})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//call api to get server files 
async function getServerFiles() {
	try {
		const serverFiles = await get(`${configuration.getServerFilesURL}`);
		return serverFiles;
	}
	catch (error) {
		showMessageBox('error', 'Error', 'getServerFiles():' + error);
	}
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//First get all server files. Then iterate through each file in the OS folder to create the view 
async function statFiles(path, localFiles) {
	try {
		let filesDetails = [];
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
		fs.readdir(path, (error, files) => {
			if (error) {
				reject(new Error('readDirectory():fs.readdir():' + error))
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
		showMessageBox('error', 'Error', 'readAsync():' + error);
	}
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//deal with load file directory menu option
function loadDirectory(path) {
	//first we will read the OS folder then we will call the api to get the files from the server and then combine the data and create the view  
	readAsync(path).then((files) => {
		//then get stats for all files
		statFiles(path, files).then((localFiles) => {
			getServerFiles().then((serverFiles) => {
				///////////////////////////////////////////////////////////////////HERE I HAVE BOTH FILES LISTS
				serverFilesArray = JSON.parse(serverFiles.body).files;
				let filesView = [];
				let flag = false;
				for (let serverFile in serverFilesArray) {
					for (let localFile in localFiles) {
						if (serverFilesArray[serverFile].filename === localFiles[localFile].filename) {
							flag = true;
							/////////////////FILE IS NOT SYNC WITH UPLOADED FILE 
							if (serverFilesArray[serverFile].version != localFiles[localFile].version) {
								localFiles[localFile].isSync = 3;
							} else {
								//FILE IS SYNCRONISED WITH UPLOADED FILE
								localFiles[localFile].isSync = 1;
							}
							////////////////////////////////////////////////
							break;
						}
					}
					if (!flag) {
						//HERE WE ADD FILES THAT ARE ON SERVER BUT NOT ON LOCAL FOLDER 
						fileObj = new File(serverFilesArray[serverFile].filename, serverFilesArray[serverFile].path, 2, false, (serverFilesArray[serverFile].size / 1024).toFixed(1), serverFilesArray[serverFile].date, serverFilesArray[serverFile].date, serverFilesArray[serverFile].version);
						filesView.push(fileObj);
					}
					flag = false;
				}
				totalFiles = localFiles.concat(filesView);
				///////////////////////////////////////////////////////////////////
				win.webContents.send('files', JSON.stringify(totalFiles))
			}).catch(function (error) {
				showMessageBox('error', 'Error', 'loadDirectory():getServerFiles():' + error);
			});
		}).catch(function (error) {
			showMessageBox('error', 'Error', 'loadDirectory():readAsync():' + error);
		})
	}).catch(function (error) {
		showMessageBox('error', 'Error', 'loadDirectory():readAsync():' + error);
	})
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//call the backend service to syncronize a file
ipcMain.on('synchronizeFile', async (event, path, filename) => {
	try {
		let formData;
		//FIRST GET VERSION WE HAVE FOR LOCAL FILE IN ORDER TO SEND IT TO API SERVICE 
		storage.get(filename, function (error, data) {
			if (error) throw new Error('downloadFile():Error getting storage');;
			formData = {
				//API request needs version and file 
				version: data.version,
				file: fs.createReadStream(path),
			}
			request.post(`${configuration.syncFileURL}`,
				{
					formData: formData
				},
				function (error, response, body) {
					let obj = JSON.parse(body);
					if (!error && response.statusCode == 200) {
						obj.theID = path;
						//on successfull response we update our version of local file and show success message on screen
						storage.set(obj.file.filename, { filename: obj.file.filename, version: obj.file.version }, function (error) {
							if (error) throw new Error('downloadFile():Error updating storage' + error);
						});
						win.webContents.send('synchronizeFileResult', JSON.stringify(obj))
					}
					if (error || response.statusCode != 200) {
						showMessageBox('error', 'Error', 'synchronizeFile():' + (!error ? response.statusCode : '') + ': ' + (!error ? obj.error : error));
					}
				}
			);
		});
	} catch (error) {
		showMessageBox('error', 'Error', 'synchronizeFile():Error while reading the file!' + error);
	}
})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
ipcMain.on('downloadFile', async (event, filename) => {
	try {
		let propertiesObject = { "filename": filename };
		storage.get('path', function (error, data) {
			try {
				if (error) throw new Error('Error getting storage');
				data.path += (process.platform == 'win32' || process.platform == 'win64' ? '\\' : '/') + filename;
				request(`${configuration.downloadFileURL}`,
					{
						qs: propertiesObject
					}, function (error, response, body) {
						try {
							if (error || response.statusCode != 200) {
								win.webContents.send('downloadFileResult:error', 'error');
								showMessageBox('error', 'Error', 'downloadFile():' + (!error ? response.statusCode : '') + ': ' + (!error ? JSON.parse(body).error : error));
							} else {
								fs.createWriteStream(data.path).write(body);
								//if file successfully arrived update the local version
								//UPDATE VERSION AS WELL!!! HE SHOULD SEND THE VERSION WITH THE FILE 
								storage.set(filename, { filename: filename, version: 1 }, function (error) {
									try {
										if (error) throw new Error('Error updating storage');
										win.webContents.send('downloadFileResult', 'success');
									} catch (error) {
										win.webContents.send('downloadFileResult:error', 'error');
										showMessageBox('error', 'Error', 'downloadFile():' + error);
									}
								});
							}
						} catch (error) {
							win.webContents.send('downloadFileResult:error', 'error');
							showMessageBox('error', 'Error', 'downloadFile():' + error);
						}
					});
			} catch (error) {
				win.webContents.send('downloadFileResult:error', 'error');
				showMessageBox('error', 'Error', 'downloadFile():' + error);
			}
		})
	} catch (error) {
		win.webContents.send('downloadFileResult:error', 'error');
		showMessageBox('error', 'Error', 'downloadFile():downloadServerFile():' + error);
	};
})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function showMessageBox(type, title, message) {
	dialog.showMessageBox(win, {
		type: type,
		buttons: ['OK'],
		title: title,
		message: message
	});
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////