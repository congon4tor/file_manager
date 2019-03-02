const { ipcRenderer } = require('electron');
var form = document.getElementById('signupForm');
var password = document.getElementById("password")
    , confirm_password = document.getElementById("confirm_password");
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function validatePassword() {
    if (password.value != confirm_password.value) {
        confirm_password.setCustomValidity("Passwords Don't Match");
    } else {
        confirm_password.setCustomValidity('');
    }
}
password.onchange = validatePassword;
confirm_password.onkeyup = validatePassword;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
form.addEventListener('submit', (evt) => {
    evt.preventDefault();
    const username = evt.target[0].value;
    const password = evt.target[1].value;
    ipcRenderer.send('signup', username, password)
})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
ipcRenderer.on('signup:Error', (event, result) => {
    alert(result)
})
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
ipcRenderer.on('signup', (event, result) => {
    alert('Successfully signed up!')
})