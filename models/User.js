// This file is for the users models 

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Store hashed password
    score: { type: Number, default: 0 },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
