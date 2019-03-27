const { ipcRenderer } = require('electron');
var form = document.getElementById('inputForm');

form.addEventListener('submit', (evt) => {
    evt.preventDefault();
    const username = evt.target[0].value;
    const password = evt.target[1].value;
    if (username && password ){
        ipcRenderer.send('login', username, password)
    }
})

ipcRenderer.on('login:Error', (event, result) => {
    alert(result, 'alert-danger')
})

ipcRenderer.on('deleteAccount', (event, result) => {
    alert('Successfully deleted your account', 'alert-success')
})

function alert(message, styleClass) {
    if (message != ""){
        document.getElementById("alert-message").innerHTML = message;
        document.getElementById("alert-div").classList.add(styleClass);
    }
    $(".alert-bottom").show();
    setTimeout(function () {
        $(".alert-bottom").hide();
    }, 6000);
}

