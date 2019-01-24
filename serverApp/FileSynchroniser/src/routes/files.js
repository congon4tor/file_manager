let express = require('express');
let router = express.Router();
let fileUpload = require('express-fileupload');
let path = require('path');

let File = require('../models/file');

// fileupload options
router.use(fileUpload({
    //sanitize filenames
    safeFileNames: true,
    preserveExtension: true
}));

router.post('/upload', (req, res)=> {
    if (req.files) {
        if (req.files.file) {
            let file = req.files.file;            
            
            file.mv(path.join(global.fileDirectory, file.name), (err)=> {
                if (err) {
                    console.error(err);
                    return res.send({error:'Error saving the file'});
                }
                return res.send({success:true});
            });
        }else{
            return res.send({error:'No file uploaded'});
        }
    }else{
        return res.send({error:'No file uploaded'});
    }
});

module.exports = router;