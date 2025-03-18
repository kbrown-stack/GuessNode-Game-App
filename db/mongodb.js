const mongoose = require('mongoose');
const config = require('../config/config'); // This is to import the config file.

function connectToDb() {
    mongoose.connect(config.MONGODB_URL);

    mongoose.connection.on('connected', () => {
        console.log('Mongodb connected Successfully');
    });

    mongoose.connection.on('error', (err) => {   // This is an else statement  if it fails to connect
        console.log(err);
    });
}

module.exports = connectToDb;
