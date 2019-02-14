let express = require('express');
let router = express.Router();
let bcrypt = require('bcryptjs');
let passport = require('passport');

let User = require('../models/user');

//login funtcion recieves a username and a password the actual check is done in config/passport
router.post('/login', (req, res, next)=>{
    passport.authenticate('local',(err, user, info)=>{ //authenticate using a custom callback
        if (err) {
            return res.status(500).send({success: false, error: "Error authenticating user"});
        }
        if (!user) { //If error authenticating send the error message and 401 Unauthorised
            return res.status(401).send({success: false, error: info.message});
        }else{ //if authentication was correct login the user
            req.login(user, (err)=>{
                if (err) {
                    return res.status(500).send({success: false, error: "Error authenticating user"});
                }
                return res.send({success: true});
            });
        }
    })(req, res, next);
});

//logout function
router.get('/logout', function(req, res){
    req.logout();
    res.send({success:true});
});

//getUsers send the client a JSON with updated info about users
router.get('/getUsers', ensureAuthenticated, (req, res)=> {
    //Look for all the users in the database
    User.find((err, users)=>{
        if (err) {
            console.error(err);
            return res.status(500).send({success: false, error: "Error searching users in the database"});
        }
        //This if is not needed as users will be [] if no users exist so else will never be executed
        if(users){ //check if there are users
            res.send({success: true, users: users});
        }else{ //there are no users
            res.send({success: true, users: null});
        }
    });
});

//Signup creates a new user account recieving a username and password
router.post('/signup', (req, res)=>{
    if(req.body.username && req.body.password){//check the parameters are included in the request

        bcrypt.genSalt(10, function(err, salt){//generate the salt for the hash
            bcrypt.hash(req.body.password, salt, function(err, hash){//hash the password
                if(err){
                    console.error(err);
                    return res.status(500).send({success: false, error:'Error saving the user in the database'});
                }
                //Create newUser object
                let user = new User();
                user.username = req.body.username;
                user.password = hash;

                user.save((err, svaedUser)=>{ //save the user to the database
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
    }else{ //If no username or password was provided error
        return res.status(400).send({success: false, error:'A username and a password must be provided'});
    }
});

//Delete function to delete the callers user account
router.get('/delete',ensureAuthenticated, (req, res)=>{ //ensures user is authenticated
    if(req.user){ //double check that user is loged in
        //Find and remove the user that did the request from the database
        User.findByIdAndRemove(req.user.id, (err, user) => {
            if (err) {
                return res.send({success: false, error:'Error deleting the user from the database'});
            }
            return res.send({success: true});
        });
    }else{
        return res.status(401).send({success: false, error:'User not authenticated'});
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