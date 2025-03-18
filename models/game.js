const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    sessionId: {type: String, required: true, unique: true},
    gameMaster: { type: String, required: true},

    players: [{
        id: String,
        username: String,
        score: Number,
        attempts: Number
    }],

    question: String,
    answer: String,
    status: {type: String, enum: ["waiting", "in-progress", "completed"], default: "waiting"}


}, 

{timestamps: true});

module.exports = mongoose.model("Game", gameSchema)