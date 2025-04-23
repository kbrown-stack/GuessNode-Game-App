const express = require("express");
const router = express.Router();
const GameSessionController = require("../controllers/gameController");


// Route to get the GameSession page
router.get("/:sessionId", GameSessionController.gamePage);

module.exports = router;

// const express = require("express");
// const router = express.Router();
// const gameController = require("../controllers/gameController");


// // Route to get the game page
// router.get("/:sessionId", gameController.gamePage);

// module.exports = router;
