const LocalStrategy = require('passport-local').Strategy;
const User = require('../src/models/user');
const bcrypt = require('bcryptjs');

//Authentication function
module.exports = function(passport){
    passport.use(new LocalStrategy((username, password, done)=>{
        //look for the user in the database
        User.findOne({username:username}, (err, user)=>{
            if(err){
                console.error(err);
                return done(err);
            }
            if(!user){//check if the user exists
                return done(null, false, {message: 'Wrong username or password'});
            }
            bcrypt.compare(password, user.password, (err, isMatch)=>{//check if the password is correct
                if(err){
                    console.error(err);
                    return done(err);
                }
                if(isMatch){//password is correct
                    return done(null, user);
                }else{
                    return done(null, false, {message: 'Wrong username or password'});
                }
            });
        });
    }));

    passport.serializeUser((user,done)=>{ //gets id given a user
        done(null, user.id);
    });

    passport.deserializeUser((id, done)=>{ //gets a user given an id
        User.findById(id,(err, user)=>{
            done(err,user);
        });
    });
}