const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const fs = require('fs');
const request = require('request');
const util = require('util');

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
let boot = () => {
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
					//if it is not a directory get some more stats and change the icon IS SYNC ON BEGIN IS 0 (FILE EXISTS ON DESKTOP) FOR EVERY FILE
					fileObj = new File(file, `${path}${file}`, 0, false, (stats.size/1024).toFixed(1), stats.mtimeMs, stats.birthtimeMs, 1);
					storage.set(file, { filename: file, version: 1 }, function (error) {
						if (error) throw error;
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
ipcMain.on('checkExistence', async (event, path) => {
	try {
		var exists = checkExistence(path);
		if (!exists) {
			dialog.showMessageBox(win, {
				type: 'warning',
				buttons: ['OK'],
				title: 'Warning',
				message: 'checkExistence():File does not exist. Maybe you have to download it first'
			});
		}
		win.webContents.send('checkExistence', exists)
	} catch (error) {
		dialog.showMessageBox(win, {
			type: 'error',
			buttons: ['OK'],
			title: 'Error',
			message: 'checkExistence():fs.existsSync():' + error
		});
		win.webContents.send('checkExistence:error', error)
	}
})
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
				reject(new Error('readDirectory():fs.readdir():'+err))
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
							fileObj = new File(serverFilesArray[serverFile].filename, serverFilesArray[serverFile].path, 2, false, (serverFilesArray[serverFile].size/1024).toFixed(1), serverFilesArray[serverFile].date, serverFilesArray[serverFile].date, serverFilesArray[serverFile].version);
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
ipcMain.on('synchronizeFile', async (event, path, filename) => {
	try {
		var formData;
		//FIRST GET VERSION WE HAVE FOR LOCAL FILE IN ORDER TO SEND IT TO API SERVICE 
		storage.get(filename, function (error, data) {
			if (error) throw new Error('downloadFile():Error updating storage');;
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
					if (!error && response.statusCode == 200) {
						var obj = JSON.parse(body);
						obj.theID = path;
						//on successfull response we update our version of local file and show success message on screen
						storage.set(obj.filename, { filename: obj.filename, version: obj.version }, function (error) {
							if (error) throw error;
						});
						win.webContents.send('synchronizeFileResult', JSON.stringify(obj))
					}
					if (error || response.statusCode != 200) {
						dialog.showMessageBox(win, {
							type: 'error',
							buttons: ['OK'],
							title: 'Error',
							message: 'synchronizeFile():' + (!error ? response.statusCode : '') + ' ' + error
						});
						win.webContents.send('synchronizeFileResult:error', (!error ? response.statusCode : '') + ' ' + error)
					}
				}
			);
		});
	} catch (error) {
		dialog.showMessageBox(win, {
			type: 'error',
			buttons: ['OK'],
			title: 'Error',
			message: 'synchronizeFile():Error while reading the file!' + error
		});
		win.webContents.send('synchronizeFileResult:error', error)
	}
})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
ipcMain.on('downloadFile', async (event, filename) => {
	try {
		var propertiesObject = { "filename": filename };
		storage.get('path', function (error, data) {
			if (error) throw new Error('downloadFile():Error retrieving from storage');
			data.path += (process.platform == 'win32' || process.platform == 'win64' ? '\\' : '/') + filename;
			request(`${configuration.downloadFileURL}`, { qs: propertiesObject }).pipe(fs.createWriteStream(data.path));
			//if file successfully arrived update the local version
			storage.set(filename, { filename: filename, version: 1 }, function (error) {
				if (error) throw new Error('downloadFile():Error updating storage');
			});
			var file = new File(filename, `${data.path}`, 1, false, 0, '', '', 1);
			win.webContents.send('downloadFileResult', file);
		})
	} catch (error) {
		dialog.showMessageBox(win, {
			type: 'error',
			buttons: ['OK'],
			title: 'Error',
			message: 'downloadFile():downloadServerFile():' + error
		});
		win.webContents.send('downloadFileResult:error', error)
	};
})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
