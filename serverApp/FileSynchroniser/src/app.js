let express = require('express');
let dbConfig = require('../config/database.js');
let mongoose = require('mongoose');

//Create the express app
let app = express();
//Look in the env vars for the PORT or default to 3000
const PORT = process.env.PORT || 3000;

//Set up MongoDB database
mongoose.connect(`mongodb://${dbConfig.user}:${dbConfig.password}@${dbConfig.server}/${dbConfig.database}`, { useNewUrlParser: true });
var db = mongoose.connection;

// called when connection established with DB
db.once('open', () => {
    console.log('Connected to MongoDB');
});

// called if an error ocurres with the DB
db.on('error', (err) => {
    console.error(err);
});


//Helloworld get request
app.get('/', (req, res) => res.send('Hello World!'))

app.listen(PORT,()=> console.info(`Server has started on ${PORT}`));