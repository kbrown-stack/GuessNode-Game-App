const express = require("express");
const gameController = require("../controllers/gameController");
const router = express.Router();

// Route to get the game page
router.get("/:sessionId", gameController.gamePage);

module.exports = router;
