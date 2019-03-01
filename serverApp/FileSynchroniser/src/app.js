let express = require('express');
let dbConfig = require('../config/database.js');
let mongoose = require('mongoose');
let logger = require('morgan');
let path = require('path');
let fileUpload = require('express-fileupload');
var cookieParser = require('cookie-parser');
let passport = require('passport');
let session = require('express-session');
let MongoStore = require('connect-mongo')(session);
let createError = require('http-errors');


let fileRouter = require('./routes/files');
let userRouter = require('./routes/users');

//Create the express app
let app = express();
//Look in the env vars for the PORT or default to 3000
const PORT = process.env.PORT || 3000;

//Set up MongoDB database
mongoose.connect(`mongodb://${dbConfig.user}:${dbConfig.password}@${dbConfig.server}/${dbConfig.database}`, dbConfig.options);
var db = mongoose.connection;

// called when connection established with DB
db.once('open', () => {
    console.log('Connected to MongoDB');
});

// called if an error ocurres with the DB
db.on('error', (err) => {
    console.error(err);
});

//Set up the logger
app.use(logger('[:date] - :method :url - :status -- :response-time'));

// fileupload options
app.use(fileUpload({
    //sanitize filenames
    safeFileNames: /[^\w.-\s]/gi
}));

//Set up bodyparser for receiving JSON in body
app.use(express.json());

app.use(cookieParser());
//Express session
app.use(session({
    secret:'default_secret',
    saveUninitialized:true,
    resave:true,
    store: new MongoStore({
        url: `mongodb://${dbConfig.user}:${dbConfig.password}@${dbConfig.server}/${dbConfig.database}`,
        collection: 'sessions'
    }),
    cookie: {secure: false} //Needed if using HTTP instead of HTTPS
}));

//Passport config
require('../config/passport')(passport);
//Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

//Create a global var for the directory where files will be stored
global.fileDirectory = path.join(__dirname, '/../synchronisedFiles');
//Use the router for everything related to the files
app.use('/file', fileRouter);
app.use('/user', userRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
    next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.send(err.message);
});

app.listen(PORT,()=> console.info(`Server has started on ${PORT}`));