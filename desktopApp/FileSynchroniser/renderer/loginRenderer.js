const { ipcRenderer } = require('electron');


document.getElementById('loginForm').addEventListener('submit', (evt) => {
    evt.preventDefault();

    const username = evt.target[0].value;
    const password = evt.target[1].value;
    ipcRenderer.send('login', username, password)
})
