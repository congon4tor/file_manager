const { ipcRenderer } = require('electron');
var form = document.getElementById('inputForm');

form.addEventListener('submit', (evt) => {
    evt.preventDefault();
    const username = evt.target[0].value;
    const password = evt.target[1].value;
    ipcRenderer.send('login', username, password)
})

ipcRenderer.on('login:Error', (event, result) => {
    alert(result)
})

function alert(message) {
    if (message != "")
        document.getElementById("alert-message").innerHTML = message;
    $(".alert-bottom").show();
    setTimeout(function () {
        $(".alert-bottom").hide();
    }, 6000);
}