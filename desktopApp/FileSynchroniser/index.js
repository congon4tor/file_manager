const { app, BrowserWindow, globalShortcut } = require('electron');
const url = require('url');

function boot() {
	win = new BrowserWindow({
		width: 500,
		height: 500,
		resizable: false,
		frame: true
	})

	win.loadURL(url.format({
		pathname: 'index.html',
		slashes: true
	}))
}

app.on('ready', boot);