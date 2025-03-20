const express = require("express");
const router = express.Router();
const gameController = require("../controllers/gameController");


// Route to get the game page
router.get("/:sessionId", gameController.gamePage);

module.exports = router;
