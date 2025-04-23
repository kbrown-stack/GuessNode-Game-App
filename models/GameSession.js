// This file creates the GameSession session models for player and GameSession.

const mongoose = require("mongoose");

// This is a schema for one player.
const playerSchema = new mongoose.Schema({
  id: { type: String },
  username: { type: String, required: true },
  score: { type: Number, default: 0 },
  attempts: { type: Number, default: 5 },
});

// Schema models for a GameSession session.

const gameSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true }, // This ensures the session ID is existing in the database document.
  GameSessionMaster: { type: String, required: true },
  // players: [playerSchema],
  players: [{type: mongoose.Schema.Types.ObjectId, ref: 'player'}],
  question: { type: String, default: null }, // Question for the round
  answer: { type: String, default: null }, // Correct answer
  status: { type: String, enum: ["waiting","playing", "ended"], default: "waiting" }, // waiting, playing, ended
}, { timestamps: true});

// To make the index unique 

// GameSessionSessionSchema.index({sessionId: 1}, {unique: true});


const GameSession = mongoose.model("GameSession", gameSessionSchema);
// const Player = mongoose.model("Player", playerSchema);

module.exports = { GameSession };
