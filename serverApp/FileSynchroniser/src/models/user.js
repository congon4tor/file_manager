var mongoose = require('mongoose');

// user schema
var userSchema = mongoose.Schema({
    //username 
    username: {
        type: String,
        required: true,
        unique: true
    },
    //hash of the users password (salted sha256)
    password: {
        type: String,
        required: true
    }
});

var User = module.exports = mongoose.model('User', userSchema);