var mongoose = require('mongoose');

// file schema
var fileSchema = mongoose.Schema({
    //Real filename 
    filename: {
        type: String,
        required: true,
        unique: true
    },
    //Path relative to the fileDirectory
    path: {
        type: String,
        required: true,
        unique: true
    },
    //Version number of the file
    version: {
        type: Number,
        required: true
    },
    //hash of the file in the current version
    hash: {
        type: String,
        required: true
    },
    //Date the last version was uploaded
    date: {
        type: Date,
        required: true
    },
    //Size in Bytes of the file
    size: {
        type: Number,
        required: true
    }

});

var File = module.exports = mongoose.model('File', fileSchema);