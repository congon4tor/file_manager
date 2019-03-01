let express = require('express');
let router = express.Router();
let path = require('path');
let fs = require('fs');
let crypto = require('crypto');
let jsdiff = require("diff");
let isBinaryFile = require("isbinaryfile");


let File = require('../models/file');


// fileupload options
router.use(fileUpload({
    //sanitize filenames
    safeFileNames: /[^\w.-\s]/gi
}));

//getFileInfo send the client a JSON with updated info about files (must be logged is)
router.get('/getInfo', ensureAuthenticated, (req, res)=> {
    if(req.query.filename){ //check if client sent filter
        File.findOne({ filename: req.query.filename, owner: req.user }, (err, file)=>{ //Search file with filename and owner = user
            if (err) {
                console.error(err);
                return res.status(500).send({success: false, error: "Error searching the file in the database"});
            }
            if(file){ //check if there is a file
                res.send({success: true, file: file});
            }else{ //there are no files
                res.send({success: false, file: null});
            }
        });
    }else{
        //Look for all the files in the database that belong to the user
        File.find({ owner: req.user }, (err, files)=>{
            if (err) {
                console.error(err);
                return res.status(500).send({success: false, error: "Error searching files in the database"});
            }
            //This if is not needed as files will be [] if no files exist so else will never be executed
            if(files){ //check if there are files
                res.send({success: true, files: files});
            }else{ //there are no files
                res.send({success: true, files: null});
            }
        });
    }
});


//Push function is used to upload, update or delete a file ( must be logged in)
router.post('/push', ensureAuthenticated, (req, res)=> {
    //Check if there are files in the request
    if (req.files) {
        //Check for the file input with name file (<input type="file" name="file">)
        if (req.files.file) {
            let userFile = req.files.file;            
            //Look in DB to see if file already exists for this user
            File.findOne({ filename: userFile.name, owner: req.user }, (err, file)=>{
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
                        if(parseInt(req.body.version) === file.version || req.body.force === "true"){ //Files versions are the same so there is no conflict or if the force flag is set to true
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
                                file.size = userFile.data.byteLength;
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

                    let newFile = new File();

                    //Move file to the directory
                    userFile.mv(path.join(global.fileDirectory, newFile.id), (err)=> {
                        if (err) {
                            console.error(err);
                            return res.status(500).send({success: false, error:'Error saving the file'});
                        }
                        //Create file object to store file info in DB
                        newFile.filename = userFile.name;
                        //Store owner
                        newFile.owner = req.user;
                        newFile.version = 1;
                        //Calculate hash
                        let hash = crypto.createHash('sha256');
                        hash.update(userFile.data);
                        newFile.hash = hash.digest('hex');
                        newFile.date = new Date();
                        newFile.size = userFile.data.byteLength;
                        newFile.path = path.join(global.fileDirectory, newFile.id);
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
            //Look in the DB to see if file exists for this user
            File.findOne({ filename: req.body.filename, owner: req.user }, (err, file)=>{
                if (err) {
                    console.error(err);
                    return res.status(500).send({success: false, error: "Error searching files in the database"});
                }
                //Check that file exists
                if(file){
                    //Check if file is last version
                    if(parseInt(req.body.version) === file.version || req.body.force === "true"){ //Files versions are the same so there is no conflict
                        //Delete/unlink the file
                        fs.unlink(file.path, (err) => {
                            if (err) {
                                console.error(err);
                                return res.status(500).send({success: false, error: "Error deleting file"});
                            }
                            //Delete file info from DB
                            File.deleteMany({ filename: req.body.filename, owner: req.user }, function (err) {
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

//getFile recive filename from client respond with file (must be logged in)
router.get('/getFile', ensureAuthenticated, (req, res)=> {
    //Look for the file with the specified filename and owner in the database
    File.findOne({filename: req.query.filename, owner: req.user}, (err, file)=>{
        if (err) {
            console.error(err);
            return res.status(500).send({success: false, error: "Error searching files in the database"});
        }
        if(file){ //check if file exists
            // Sends file to the client, allow dotfiles means hidden files are allowed to be downloaded
            res.download(file.path, file.filename, {dotfiles:"allow"}, (err)=>{
                if(err){
                    console.error(err);
                    return res.status(500).send({success: false, error: "Error transfering the file"});
                }
            });
        }else{ //file not found
            return res.status(400).send({success: false, error: "Error file not found in the database"});
        }
    });
});

//getDiff recive conflict file from client respond with diff between the server version and the uploaded version (must be logged in)
router.post('/getDiff', ensureAuthenticated, (req, res)=> {
    //Check if there are files in the request
    if (req.files) {
        //Check for the file input with name file (<input type="file" name="file">)
        if (req.files.file) {
            let userFile = req.files.file;
            //Look for the file with the specified filename and owner in the database
            File.findOne({filename: userFile.name, owner:req.user}, (err, file)=>{
                if (err) {
                    console.error(err);
                    return res.status(500).send({success: false, error: "Error searching files in the database"});
                }
                if(file){ //check if file exists
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
                            return res.status(400).send({success: false, error:'File version is up to date there is no conflict'});
                        }else{
                            //Check if file is a text file
                            let serverFile =fs.readFileSync(file.path, 'utf8');
                            let size = fs.lstatSync(file.path).size;
                            if(!isBinaryFile.isBinaryFileSync(fs.readFileSync(file.path), size)){
                                let patch = jsdiff.createPatch(file.filename, serverFile, userFile.data.toString('utf8'),'','',{context:100000});
                                res.send({success: true, diff: patch, version: file.version});
                            }else{
                                return res.status(400).send({success: false, error:'Can not generate diff of a binary file'});
                            }
                        }
                    }

                    
                }else{ //file not found
                    return res.status(400).send({success: false, error: "Error file not found in the database"});
                }
            });

        }
    }
    
});

//Access control, this function will ensure that the request comes from an authenticated user
function ensureAuthenticated(req, res, next){
    if (req.isAuthenticated()){ //If authenticated continue 
        return next();
    }else{ //If not authenticated respond with error
        return res.status(401).send({success: false, error:'User not authenticated'});
    }
}

module.exports = router;