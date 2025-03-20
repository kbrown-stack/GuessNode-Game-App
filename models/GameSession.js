// This file creates the game session models for player and game.

const mongoose = require("mongoose");

// This is a schema for one player.
const playerSchema = new mongoose.Schema({
  id: { type: String, required: true },
  username: { type: String, required: true },
  score: { type: Number, default: 0 },
  attempts: { type: Number, default: 5 },
});

// Schema models for a game session.

const gameSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true }, // This ensures the session ID is existing in the database document.
  gameMaster: { type: String, required: true },
  players: [playerSchema],
  question: { type: String, default: null }, // Question for the round
  answer: { type: String, default: null }, // Correct answer
  status: { type: String, default: "waiting" }, // waiting, playing, ended
});

const GameSession = mongoose.model("GameSession", gameSessionSchema);

module.exports = GameSession;
