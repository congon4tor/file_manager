let express = require('express');
let router = express.Router();
let fileUpload = require('express-fileupload');
let path = require('path');
let fs = require('fs');
let crypto = require('crypto');


let File = require('../models/file');

// fileupload options
router.use(fileUpload({
    //sanitize filenames
    safeFileNames: true,
    preserveExtension: true
}));

//getFileInfo send the client a JSON with updated info about files
router.get('/getInfo', (req, res)=> {
    //Look for all the files in the database
    File.find((err, files)=>{
        if (err) {
            console.error(err);
            return res.status(500).send({success: false, error: "Error searching files in the database"});
        }
        //This if is not needed as files will be [] if no files exist so else will never be executed
        if(files){ //check if there are files 
            console.log(files);
            res.send({success: true, files: files});
        }else{ //there are no files
            res.send({success: true, files: null});
        }
    });
});


//Push recives
router.post('/push', (req, res)=> {
    //Check if there are files in the request
    if (req.files) {
        //Check for the file input with name file (<input type="file" name="file">)
        if (req.files.file) {
            let userFile = req.files.file;            
            //Look in DB to see if file already exists
            File.findOne({ filename: userFile.name }, (err, file)=>{
                if (err) {
                    console.error(err);
                    return res.status(500).send({success: false, error: "Error searching files in the database"});
                }
                //Check if file exists
                if(file){ //File exists, so update it
                    //Check the hash to see if the file has changed
                    let hash = crypto.createHash('sha256');
                    hash.update(userFile.data);
                    let userFileHash = hash.digest('hex');
                    //TODO: check the server's file hash not the one from the DB (DB and FS are out of sync)
                    if(file.hash === userFileHash){ //Hash is the same file has not changed
                        return res.status(400).send({success: false, error:'No changes on file'});
                    }else{
                        //Check the file version to see if the file was latest version before changes
                        if(parseInt(req.body.version) === file.version){ //Files versions are the same so there is no conflict
                            //Before moving the file to the directory check that the directory exists
                            if (!fs.existsSync(global.fileDirectory)) {
                                //If it does not exist create the directory
                                fs.mkdirSync(global.fileDirectory, { recursive: true });
                            }
                            //Move file to the directory
                            userFile.mv(path.join(file.path), (err)=> {
                                if (err) {
                                    console.error(err);
                                    return res.status(500).send({success: false, error:'Error saving the file'});
                                }
                                //Update file object to store file info in DB
                                file.version++;
                                file.hash = userFileHash;
                                file.date = new Date();
                                //Save file info to DB
                                file.save((err, savedFile) => {
                                    if (err) {
                                        console.error(err);
                                        return res.status(500).send({success: false, error:'Error saving the file info in the database'});
                                    } else {
                                        //File updated successfully
                                        return res.send({success: true, file: savedFile});
                                    }
                                });
                            });
                        }else{ //File versions are different HTTP 409 == Conflict
                            res.status(409).send({success: false, error: "The file was not up to date, not updating it to avoid conflicts"})
                        }   
                    }
                }else{ //File doesnt exist create it
                    //Before moving the file to the directory check that the directory exists
                    if (!fs.existsSync(global.fileDirectory)) {
                        //If it does not exist create the directory
                        fs.mkdirSync(global.fileDirectory, { recursive: true });
                    }
                    //Move file to the directory
                    userFile.mv(path.join(global.fileDirectory, userFile.name), (err)=> {
                        if (err) {
                            console.error(err);
                            return res.status(500).send({success: false, error:'Error saving the file'});
                        }
                        //Create file object to store file info in DB
                        let newFile = new File();
                        newFile.filename = userFile.name;
                        newFile.version = 1;
                        //Calculate hash
                        let hash = crypto.createHash('sha256');
                        hash.update(userFile.data);
                        newFile.hash = hash.digest('hex');
                        newFile.date = new Date();
                        newFile.path = path.join(global.fileDirectory, userFile.name);
                        //Save file info to DB
                        newFile.save((err, savedFile) => {
                            if (err) {
                                console.error(err);
                                //TODO: should remove the file from the dir
                                return res.status(500).send({success: false, error:'Error saving the file info in the database'});
                            } else {
                                //File created successfully
                                return res.send({success: true, file: savedFile});
                            }
                        });
                    });
                }
            });
        }else{ //No files under input name="file"
            return res.status(400).send({success: false, error:'No file uploaded'});
        }
    }else{ //No files uploaded
        //Check if delete flag is true
        if( req.body.delete === "true" ){ //delete == true
            //Look in the DB to see if file exists
            File.findOne({ filename: req.body.filename }, (err, file)=>{
                if (err) {
                    console.error(err);
                    return res.status(500).send({success: false, error: "Error searching files in the database"});
                }
                //Check that file exists
                if(file){
                    //Check if file is last version
                    if(parseInt(req.body.version) === file.version){ //Files versions are the same so there is no conflict
                        //Delete/unlink the file
                        fs.unlink(file.path, (err) => {
                            if (err) {
                                console.error(err);
                                return res.status(500).send({success: false, error: "Error deleting file"});
                            }
                            //Delete file info from DB
                            File.deleteMany({ filename: req.body.filename }, function (err) {
                                if (err) {
                                    //TODO: should resave the file to the dir
                                    console.error(err);
                                    return res.status(500).send({success: false, error: "Error deleting file info from database"});
                                }
                                //File deleted successfully
                                return res.send({success: true, file: null});
                            });
                        });
                    }else{ //File versions are different HTTP 409 == Conflict
                        res.status(409).send({success: false, error: "The file was not up to date, not deleting it to avoid conflicts"})
                    }
                }else{ //file does not exist send error
                    return res.status(400).send({success: false, error:'File to delete does not exist'});
                }
            });
        }else{ // delete == false so client intended to upload a file 
            return res.status(400).send({success: false, error:'No file uploaded'});
        }
    }
});

module.exports = router;