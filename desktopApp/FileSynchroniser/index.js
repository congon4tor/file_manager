const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const fs = require('fs');
const request = require('request');
const util = require('util');
const { shell } = require('electron');
const crypto = require('crypto');
const storage = require('electron-json-storage');
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
				if (error) showMessageBox('error', 'Error', 'storage' + error)
			});
			loadDirectory(files[0])
		}
	})
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function refreshScreen() {
	storage.has('path', function (error, hasKey) {
		try {
			if (error) throw error;
			if (hasKey) {
				storage.get('path', function (error, data) {
					try {
						if (error) throw error;
						loadDirectory(data.path);
					} catch (error) {
						showMessageBox('error', 'Error', 'storage' + error);
					}
				})
			} else {
				loadDirectoryMenuOption();
			}
		} catch (error) {
			showMessageBox('error', 'Error', 'storage' + error);
		}
	});
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
		fs.stat(path + file, (error, stats) => {
			if (error) reject(error)
			let fileObj;
			if (stats.isDirectory()) {
				fileObj = new File(file, `${path}${file}`, true, true, 0, '', '', 1);
			}
			else {
				//if it is not a directory get some more stats and change the icon IS SYNC ON BEGIN IS 0 (FILE EXISTS ON DESKTOP) FOR EVERY FILE
				fileObj = new File(file, `${path}${file}`, 0, false, (stats.size / 1024).toFixed(1), stats.mtimeMs, stats.birthtimeMs, 1);
				storage.set(file, { filename: file, version: 1 }, function (error) {
					if (error) reject(error)
				})
			}
			resolve(fileObj);

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
		if (exists) {
			shell.openItem(path)
		} else {
			showMessageBox('warning', 'Warning', 'File does not exist. You have to download it first.');
		}
		win.webContents.send('openFile', exists)
	} catch (error) {
		showMessageBox('error', 'Error', 'checkExistence():fs.existsSync():' + error);
	}
})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//call api to get server files 
async function getServerFiles(filename) {
	let queryString = { "filename": filename };
	const serverFiles = await get(`${configuration.getServerFilesURL}`, filename === '' ? null : {
		qs: queryString
	});
	return serverFiles;
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//First get all server files. Then iterate through each file in the OS folder to create the view 
async function statFiles(path, localFiles) {
	try {
		let filesDetails = [];
		for (let localFile of localFiles) {
			//for every file call the fs.stat
			let file = await stat(path, localFile);
			filesDetails.push(file);
		}
		return filesDetails;
	} catch (error) {
		throw new Error('fs.stat():' + error);
	}
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//read directory to get files 
function readDirectory(path) {
	return new Promise((resolve, reject) => {
		fs.readdir(path, (error, files) => {
			if (error) {
				reject(new Error('fs.readdir():' + error))
			} else {
				resolve(files);
			}
		});
	});
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function getLocalFileHash(path) {
	return new Promise((resolve, reject) => {
		let hash = crypto.createHash('sha256');
		let stream = fs.createReadStream(path);
		stream.on('data', data => hash.update(data));
		stream.on('end', () => resolve(hash.digest('hex')));
		stream.on('error', error => reject(error));
	});
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//deal with load file directory menu option
async function loadDirectory(path) {
	//first we will read the OS folder then we will call the api to get the files from the server and then combine the data and create the view  
	try {
		let serverFiles = await getServerFiles('').catch((error) => { throw new Error('Error getting server files.' + error) });
		let files = await readDirectory(path).catch((error) => { throw new Error('Error reading local folder.' + error) });
		let localFiles = await statFiles(path, files).catch((error) => { throw new Error('Error getting information on local files.' + error) });

		let serverFilesArray = JSON.parse(serverFiles.body).files;
		let filesView = [];
		let flag = false;

		for (let serverFile in serverFilesArray) {
			for (let localFile in localFiles) {
				if (serverFilesArray[serverFile].filename === localFiles[localFile].filename) {
					flag = true;
					/////////////////FILE IS NOT SYNC WITH UPLOADED FILE 
					if (serverFilesArray[serverFile].version != localFiles[localFile].getVersion()) {
						localFiles[localFile].setIsSync(3);
					} else {
						let userFileHash = await getLocalFileHash(localFiles[localFile].getTheID());
						if (userFileHash === serverFilesArray[serverFile].hash) { //Hash is the same file has not changed
							localFiles[localFile].setIsSync(1);
						} else {//file is changed so show fix button
							localFiles[localFile].setIsSync(3);
						}
					}
				}
				break;
			}
			if (!flag) {
				//HERE WE ADD FILES THAT ARE ON SERVER BUT NOT ON LOCAL FOLDER 
				fileObj = new File(serverFilesArray[serverFile].filename, serverFilesArray[serverFile].path, 2, false, (serverFilesArray[serverFile].size / 1024).toFixed(1), serverFilesArray[serverFile].date, serverFilesArray[serverFile].date, serverFilesArray[serverFile].version);
				filesView.push(fileObj);
			}
			flag = false;
		}
		totalFiles = localFiles.concat(filesView);
		win.webContents.send('files', JSON.stringify(totalFiles))
	} catch (error) {
		showMessageBox('error', 'Error', 'loadDirectory():' + error);
		win.webContents.send('files:Error', 'error')
	}
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//call the backend service to syncronize a file
ipcMain.on('synchronizeFile', async (event, path, filename) => {
	let formData;
	//FIRST GET VERSION WE HAVE FOR LOCAL FILE IN ORDER TO SEND IT TO API SERVICE 
	storage.get(filename, function (error, data) {
		try {
			if (error) throw error;
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
							try {
								if (error) throw error;
								win.webContents.send('synchronizeFileResult', JSON.stringify(obj))
							} catch (error) {
								showMessageBox('error', 'Error', 'Storage:' + error);
								win.webContents.send('synchronizeFileResult:Error', 'error')
							}
						});
					}
					if (error || response.statusCode != 200) {
						showMessageBox('error', 'Error', 'synchronizeFile():' + (!error ? response.statusCode : '') + ': ' + (!error ? obj.error : error));
						win.webContents.send('synchronizeFileResult:Error', 'error')
					}
				}
			);
		} catch (error) {
			showMessageBox('error', 'Error', 'Storage:' + error);
			win.webContents.send('synchronizeFileResult:Error', 'error')
		}
	})
})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
ipcMain.on('downloadFile', async (event, filename) => {
	storage.get('path', async function (error, data) {
		try {
			if (error) throw error;
			let queryString = { "filename": filename };
			data.path += (process.platform == 'win32' || process.platform == 'win64' ? '\\' : '/') + filename;
			request(`${configuration.downloadFileURL}`,
				{
					qs: queryString
				}, async function (error, response, body) {
					try {
						if (error || response.statusCode != 200) {
							showMessageBox('error', 'Error', 'downloadFile():' + (!error ? response.statusCode : '') + ': ' + (!error ? JSON.parse(body).error : error));
						} else {
							fs.createWriteStream(data.path).write(body);
							//if file successfully arrived update the local version by requesting file info for the file!!
							let serverFile = await getServerFiles(filename).catch((error) => { throw new Error('Error getting server file.' + error) });
							let serverFileObj = JSON.parse(serverFile.body).file;
							storage.set(filename, { filename: filename, version: serverFileObj.version }, function (error) {
								try {
									if (error) throw error;
									win.webContents.send('downloadFileResult', 'success');
								} catch (error) {
									showMessageBox('error', 'Error', 'downloadFile():' + error);
									win.webContents.send('downloadFileResult:Error', 'error');
								}
							});
						}
					} catch (error) {
						showMessageBox('error', 'Error', 'downloadFile():' + error);
						win.webContents.send('downloadFileResult:Error', 'error');
					}
				});
		} catch (error) {
			showMessageBox('error', 'Error', 'downloadFile():' + error);
			win.webContents.send('downloadFileResult:Error', 'error');
		}
	})

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