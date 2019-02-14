const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const fs = require('fs');
const request = require('request');
const util = require('util');
const { shell } = require('electron');
const crypto = require('crypto');
const storage = require('electron-json-storage');
let isBinaryFile = require("isbinaryfile");
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//the watched path variable so not to read the local storage all the time
let watchedPath;
//the files array that is shown on the screen
let totalFiles = [];
//browser window
let win;
//conflicts window
let conflictsWin;
//model of file 
let File = require('./src/models/file.js');
//config file with api call strings
let config = require('./config/configuration.js');
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Promisify the request get in order to return promise and not pass callback to it 
const get = util.promisify(request.get);
const post = util.promisify(request.post);
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//create browserwindow
function boot() {
	win = new BrowserWindow({
		width: 800,
		height: 600,
		useContentSize: true,
		frame: true,
		resizable: true,
		show: false,
		icon: `${__dirname}/src/img/icon.png`,
		webPreferences: {
			//for the warning it gives on console. Security issue (?)
			nodeIntegration: true
		}
	})
	win.loadURL(`file://${__dirname}/index.html`)
	win.once('ready-to-show', () => {
		refreshScreen()
		win.show()
	})
	win.on('closed', () => {
		win = null
	})
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
function conflictsBoot() {
	conflictsWin = new BrowserWindow({
		parent: win,
		modal: true,
		width: 800,
		height: 400,
		useContentSize: true,
		frame: true,
		resizable: true,
		show: false,
		icon: `${__dirname}/src/img/diff.png`,
		webPreferences: {
			//for the warning it gives on console. Security issue (?)
			nodeIntegration: true
		}
	})
	conflictsWin.loadURL(`file://${__dirname}/conflicts.html`)
	conflictsWin.setMenu(null);
	conflictsWin.on('closed', () => {
		conflictsWin = null
		//send message to first window to close loader 
		win.webContents.send('closedConflicts', 'true')
	})
	conflictsWin.once('ready-to-show', () => {
		conflictsWin.show()
	})
	// conflictsWin.webContents.openDevTools();
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function loadDirectoryMenuOption() {
	dialog.showOpenDialog({
		properties: ['openDirectory']
	}, function (files) {
		if (files) {
			//prepare the watched path variable
			watchedPath = files[0] + (process.platform == 'win32' || process.platform == 'win64' ? '\\' : '/');
			storage.set('path', { path: watchedPath }, function (error) {
				if (error) showMessageBox('error', 'Error', 'storage' + error)
			});
			loadDirectory(watchedPath)
		}
	})
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function refreshScreen() {
	if (watchedPath != null) {
		loadDirectory(watchedPath);
	} else {
		storage.has('path', function (error, hasKey) {
			try {
				if (error) throw error;
				if (hasKey) {
					storage.get('path', function (error, data) {
						try {
							if (error) throw error;
							loadDirectory(data.path);
							watchedPath = data.path;
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
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
ipcMain.on('refreshScreen', async (event) => {
	refreshScreen()
})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function localFileStorage(file) {
	return new Promise((resolve, reject) => {
		storage.has(file, (error, hasKey) => {
			if (error) throw error;
			//if the file existed we have to read its version 
			if (hasKey) {
				storage.get(file, (error, data) => {
					try {
						if (error) throw error;
						//and return the version
						resolve(data.version)
					} catch (error) {
						showMessageBox('error', 'Error', 'storage' + error);
						reject(error);
					}
				})
			} else {
				//if the file is new then we create the storage for it
				storage.set(file, { filename: file, version: 1 }, function (error) {
					if (error) reject(error)
					resolve(1)
				})
			}
		})
	});
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//get info on each file
function stat(path, file) {
	return new Promise((resolve, reject) => {
		//determine what OS is running on to add back or slash
		path += (process.platform == 'win32' || process.platform == 'win64' ? '\\' : '/');
		//read each file
		fs.stat(path + file, async (error, stats) => {
			if (error) reject(error)
			let fileObj;
			if (!stats.isDirectory()) {
				//if it is not a directory get some more stats and change the icon IS SYNC ON BEGIN IS 0 (FILE EXISTS ON DESKTOP) FOR EVERY FILE
				//////////here we have to check if the file already had a version!
				var version = await localFileStorage(file);
				fileObj = new File.File(file, `${path}${file}`, File.LOCAL_ONLY, false, ((stats.size / 1024) / 1024).toFixed(1), stats.mtimeMs, stats.birthtimeMs, version);
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
ipcMain.on('openFile', async (event, index) => {
	try {
		let path = totalFiles[index].theID;
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
	//have two calls with filename you call to get the info for certain file, with no filename you get all info
	const serverFiles = await get(config.getServerFilesURL, filename === '' ? null : {
		qs: queryString
	});
	return serverFiles;
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//First get all server files. Then iterate through each file in the OS folder to create the view 
async function statFiles(path, localFiles) {
	let filesDetails = [];
	for (let localFile of localFiles) {
		//for every file call the fs.stat
		let file = await stat(path, localFile);
		file.setIndex(filesDetails.length);
		filesDetails.push(file);
	}
	return filesDetails;
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//read directory to get files 
function readDirectory(path) {
	return new Promise((resolve, reject) => {
		fs.readdir(path, (error, files) => {
			if (error) {
				reject(new Error(error))
			} else {
				resolve(files);
			}
		});
	});
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function getLocalFileHash(path) {
	//create hash of local file to compare it with what returns from server
	return new Promise((resolve, reject) => {
		let hash = crypto.createHash('sha256');
		let stream = fs.createReadStream(path);
		stream.on('data', data => hash.update(data));
		stream.on('end', () => { stream.close(); resolve(hash.digest('hex'))} );
		stream.on('error', error => reject(error));
	});
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//deal with load file directory menu option
async function loadDirectory(path) {
	//first we will read the OS folder then we will call the api to get the files from the server and then combine the data and create the view  
	try {
		let serverFiles = await getServerFiles('').catch((error) => { throw new Error('Getting server files. ' + error) });
		let files = await readDirectory(path).catch((error) => { throw new Error('Reading local folder. ' + error) });
		let localFiles = await statFiles(path, files).catch((error) => { throw new Error('Getting information of local files. ' + error) });

		let serverFilesArray = JSON.parse(serverFiles.body).files;
		let filesView = [];
		let flag = false;

		for (let serverFile in serverFilesArray) {
			for (let localFile in localFiles) {
				if (serverFilesArray[serverFile].filename === localFiles[localFile].filename) {
					flag = true;
					/////////////////FILE IS NOT SYNC WITH UPLOADED FILE 
					if (serverFilesArray[serverFile].version != localFiles[localFile].getVersion()) {
						localFiles[localFile].setIsSync(File.DIFFERENT_VERSION);
						localFiles[localFile].setDifferentContent(true);
					} else {
						localFiles[localFile].setIsSync(File.SAME_VERSION);
						let userFileHash = await getLocalFileHash(localFiles[localFile].getTheID());
						if (userFileHash === serverFilesArray[serverFile].hash) { //Hash is the same file has not changed
							localFiles[localFile].setDifferentContent(false);
						} else {//file is changed so show fix button
							localFiles[localFile].setDifferentContent(true);
						}
					}
					break;
				}
			}
			if (!flag) {
				//HERE WE ADD FILES THAT ARE ON SERVER BUT NOT ON LOCAL FOLDER 
				fileObj = new File.File(serverFilesArray[serverFile].filename, serverFilesArray[serverFile].path, File.SERVER_ONLY, false, ((serverFilesArray[serverFile].size / 1024) / 1024).toFixed(1), serverFilesArray[serverFile].date, serverFilesArray[serverFile].date, serverFilesArray[serverFile].version);
				fileObj.setIndex(localFiles.length + filesView.length)
				filesView.push(fileObj);
			}
			flag = false;
		}
		totalFiles = [];
		//and we show totalfiles on screen 
		totalFiles = localFiles.concat(filesView);
		win.webContents.send('files', JSON.stringify(totalFiles))
	} catch (error) {
		showMessageBox('error', 'Error', '' + error);
		win.webContents.send('files:Error', 'error')
	}
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//call the backend service to syncronize a file
ipcMain.on('synchronizeFile', async (event, index, filename) => {
	let path = totalFiles[index].getTheID();
	let isSync = totalFiles[index].getIsSync();
	let differentContent = totalFiles[index].getDifferentContent();
	let version = totalFiles[index].getVersion();
	let size = totalFiles[index].getSize();
	let isBinary = false;
	if (isBinaryFile.isBinaryFileSync(fs.readFileSync(path), fs.lstatSync(path).size)) {
		isBinary = true;
	}

	if (isSync == File.DIFFERENT_VERSION && differentContent) {
		dialog.showMessageBox(win, {
			type: 'warning',
			cancelId: (isBinary ? 2 : 3),
			//bug fix: when user clicks the red X should direct to cancel 
			buttons: (isBinary ? [
				'Upload local file and replace server file',
				'Download from server and replace local file',
				'Do nothing'] :
				['See file differences',
					'Upload local file and replace server file',
					'Download from server and replace local file',
					'Do nothing']),
			title: 'Oops!',
			message: 'Somebody else has changed the file before you on the server.'
		}, resp => {
			if (!isBinary && (resp == 0)) {
				getDiff(path, version);
			} else if ((!isBinary && resp == 1) || (isBinary && resp == 0)) {
				pushFile(path, version, index, "true");
			} else if ((!isBinary && resp == 2) || (isBinary && resp == 1)) {
				downloadFile(filename);
			}
		})
	} else {
		pushFile(path, version, index, "false");
	}
})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function getDiff(path, version) {
	let stream = fs.createReadStream(path)
	let formData = {
		//API request needs version and file 
		version: version,
		file: stream,
	}
	request.post(config.getDiffURL,
		{
			formData: formData
		},
		function (error, response, body) {
			try {
				stream.close();
				if (!error && response.statusCode == 200) {
					let obj = JSON.parse(body);
					//boot the new window and show the difference when it's ready
					conflictsBoot();
					conflictsWin.once('ready-to-show', () => {
						conflictsWin.webContents.send('diffResult', obj.diff)
					})
				}
				if (error || response.statusCode != 200) {
					showMessageBox('error', 'Error', 'synchronizeFile():' + (!error ? response.statusCode : '') + ': ' + (!error ? JSON.parse(body).error : error));
					win.webContents.send('synchronizeFileResult:Error', 'error')
				}
			} catch (error) {
				showMessageBox('error', 'Error', 'synchronizeFile():' + error);
				win.webContents.send('synchronizeFileResult:Error', 'error')
			}
		}
	)
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function pushFile(path, version, index, force) {
	let stream = fs.createReadStream(path);
	let formData = {
		version: version,
		file: stream,
		force: force
	}
	request.post(config.syncFileURL,
		{
			formData: formData
		},
		function (error, response, body) {
			try {
				stream.close();
				if (!error && response.statusCode == 200) {
					let obj = JSON.parse(body);
					obj.theID = path;
					obj.index = index;
					obj.isSync = File.SAME_VERSION;
					obj.file.date = (obj.file.date).replace(/T/, ' ').replace(/\..+/, '')
					//on successfull response we update our version of local file and show success message on screen
					storage.set(obj.file.filename, { filename: obj.file.filename, version: obj.file.version }, function (error) {
						try {
							if (error) throw error;
							//also update the array of objects to show that it is sync!!
							totalFiles[index].setIsSync(File.SAME_VERSION);
							totalFiles[index].setVersion(obj.file.version);
							win.webContents.send('synchronizeFileResult', JSON.stringify(obj))
						} catch (error) {
							showMessageBox('error', 'Error', 'Storage:' + error);
							win.webContents.send('synchronizeFileResult:Error', 'error')
						}
					});
				}
				if (error || response.statusCode != 200) {
					showMessageBox('error', 'Error', 'synchronizeFile():' + (!error ? response.statusCode : '') + ': ' + (!error ? JSON.parse(body).error : error));
					win.webContents.send('synchronizeFileResult:Error', 'error')
				}
			} catch (error) {
				showMessageBox('error', 'Error', 'synchronizeFile():' + error);
				win.webContents.send('synchronizeFileResult:Error', 'error')
			}
		}
	)
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function downloadFile(filename) {
	let queryString = {
		"filename": filename
	};
	let path = watchedPath + (process.platform == 'win32' || process.platform == 'win64' ? '\\' : '/') + filename;
	request(`${config.downloadFileURL}`,
		{
			qs: queryString
		}, async function (error, response, body) {
			try {
				if (error || response.statusCode != 200) {
					win.webContents.send('downloadFileResult:Error', 'error');
					showMessageBox('error', 'Error', (!error ? response.statusCode : '') + ': ' + (!error ? JSON.parse(body).error : error));
				} else {
					let stream = fs.createWriteStream(path);
					stream.write(body);
					stream.close();
					//if file successfully arrived update the local version by requesting file info for the file!!
					let serverFile = await getServerFiles(filename).catch((error) => { throw new Error('Error getting server file.' + error) });
					let serverFileObj = JSON.parse(serverFile.body).file;
					storage.set(filename, { filename: filename, version: serverFileObj.version }, function (error) {
						try {
							if (error) throw error;
							win.webContents.send('downloadFileResult', filename);
						} catch (error) {
							win.webContents.send('downloadFileResult:Error', 'error');
							showMessageBox('error', 'Error', '' + error);
						}
					});
				}
			} catch (error) {
				win.webContents.send('downloadFileResult:Error', 'error');
				showMessageBox('error', 'Error', '' + error);
			}
		}
	);
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
ipcMain.on('downloadFile', async (event, filename) => {
	downloadFile(filename)
})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
ipcMain.on('deleteFile', async (event, index) => {
	let filename = totalFiles[index].getFileName();
	//get isSync to determine what are we deleting && the message of the dialog box
	let isSync = totalFiles[index].getIsSync();
	let version = totalFiles[index].getVersion();

	dialog.showMessageBox(win, {
		type: 'warning',
		//bug fix: when user clicks the red X should direct to cancel 
		cancelId: isSync === File.LOCAL_ONLY ? 1 : isSync === File.SERVER_ONLY ? 1 : 3,
		buttons: isSync === File.LOCAL_ONLY ? ['Delete the local file', 'Oops! Don\'t do it!'] :
			isSync === File.SERVER_ONLY ? ['Delete the server file', 'Oops! Don\'t do it!'] :
				['Delete the server file', 'Delete the local file', 'Delete both', 'Oops! Don\'t do it!'],
		title: 'Delete',
		message:
			`Are you sure you want to delete ${filename} ${isSync === File.LOCAL_ONLY ? `from your local folder?` :
				(isSync === File.SERVER_ONLY) ? `from the server?` :
					`from your local folder and the server?`}`
	}, resp => {
		//the first option is always delete // for isSync 1 and 3 we have 1 or more 2 buttons
		if ((resp === 0) || ((isSync === File.SAME_VERSION || isSync === File.DIFFERENT_VERSION) && (resp === 1 || resp === 2))) {// User selected 'Yes'
			deleteFile(filename, isSync, version, resp).then(() => {
				//correctly deleted everything
				win.webContents.send('deleteFileResult', filename);
			}).catch(error => {//error message is thrown but we have to close the loader
				win.webContents.send('deleteFileResult:Error', '');
			})
		} else {//user selected 'No'
			win.webContents.send('deleteFileResult:Error', '');
		}
	});
})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
async function deleteFile(filename, isSync, version, resp) {
	try {
		//isSync === LOCAL_ONLY delete from local folder. Only response that can be given
		if (isSync === File.LOCAL_ONLY) {
			await deleteLocalFile(filename)
		}
		//isSync === SERVER_ONLY delete from server. Only response that can be given
		else if (isSync === File.SERVER_ONLY) {
			await deleteServerFile(filename, version)
		}
		//isSync === SAME_VERSION or DIFFERENT_VERSION depends on response
		else if (isSync === File.SAME_VERSION || isSync === File.DIFFERENT_VERSION) {
			if (resp === 0) {
				await deleteServerFile(filename, version)
			} else if (resp === 1) {
				await deleteLocalFile(filename)
			} else if (resp === 2) {
				await deleteServerFile(filename, version)
				await deleteLocalFile(filename)
			}
		}
	} catch (error) { //throw the error from any of the two above
		showMessageBox('error', 'Error', '' + error);
		throw error;
	}
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
async function deleteServerFile(filename, version) {
	return new Promise((resolve, reject) => {
		let formData = {
			filename: filename,
			version: version,
			delete: 'true'
		}
		post(config.syncFileURL,
			{
				formData: formData
			}).then((response) => {
				if (response.statusCode == 200) {
					resolve()
				} else {
					reject(response.statusCode + ': ' + JSON.parse(response.body).error)
				}
			}).catch((error) => { throw new Error('' + error) });
	});
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function deleteLocalFile(filename) {
	return new Promise((resolve, reject) => {
		try {
			fs.unlinkSync(watchedPath + filename)
			//after deleting file, delete file from internal storage as well
			storage.remove(filename, function (error) {
				if (error) showMessageBox('error', 'Error', '' + error);
			});
			resolve()
		}
		catch (error) {
			reject(error)
		}
	})
}
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