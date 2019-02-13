let express = require('express');
let router = express.Router();
let bcrypt = require('bcryptjs');

let User = require('../models/user');


//getUsers send the client a JSON with updated info about users
router.get('/getUsers', (req, res)=> {
    //Look for all the users in the database
    User.find((err, users)=>{
        if (err) {
            console.error(err);
            return res.status(500).send({success: false, error: "Error searching users in the database"});
        }
        //This if is not needed as users will be [] if no users exist so else will never be executed
        if(users){ //check if there are files
            res.send({success: true, users: users});
        }else{ //there are no users
            res.send({success: true, users: null});
        }
    });
});

router.post('/signup', (req, res)=>{
    console.log(req.body);
    if(req.body.username && req.body.password){

        let plainPassword = req.body.password;;
        bcrypt.genSalt(10, function(err, salt){
            bcrypt.hash(plainPassword, salt, function(err, hash){
                if(err){
                    console.error(err);
                    return res.status(500).send({success: false, error:'Error saving the user in the database'});
                }

                let user = new User();
                user.username = req.body.username;
                user.password = hash;

                user.save((err, svaedUser)=>{
                    if (err) {
                        console.error(err);
                        return res.status(500).send({success: false, error:'Error saving the user in the database'});
                    } else {
                        //User created successfully
                        return res.send({success: true});
                    }
                });
            });
        });
    }else{
        return res.status(400).send({success: false, error:'A username and a password must be provided'});
    }
});

module.exports = router;