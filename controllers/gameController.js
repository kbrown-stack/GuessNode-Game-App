const mongoose = require("mongoose");
const Game = require("../models/GameSession");
const Question = require("../models/question");
const { response } = require("express");

// This handles the route for the game page

exports.gamePage = async (req, res) => {
  // const sessionId = req.params.sessionId;

  try {
    const { sessionId } = req.params;

    const game = await Game.findOne({ sessionId });

    if (game) {
      res.render("game", { sessionId, gameMaster: game.gameMasterUsername }); // This shows game master is now included.
    } else {
      console.log("Game session not found!"); // loggg
      res.status(404).send("Game session not found");
    }
  } catch (error) {
    // console.error("Error fetching game session:", error);
    res.status(500).send("internal server error");
  }
};

// This handles the Websocket events

exports.handleSocketEvents = (socket, io) => {
  //Creating Game

  socket.on("createGame", async ({ username }) => {
  
    try {
      const sessionId = `game-${Date.now()}`;

      const newGame = new Game({
        sessionId,
        gameMaster: socket.id, // this stores the game master ID
        gameMasterUsername: username, // This stores the username.
        players: [{ id: socket.id, username, score: 0, attempts: 5 }],
        status: "waiting",
      });

      await newGame.save(); // Save the game session in MongoDB
      // console.log("Game created and saved to Mongodb:", sessionId);


  console.log("Received game session ID:", sessionId)
      socket.emit("gameCreated", { sessionId }); // This is sending the sessionID back to the client
    } catch (error) {
      // console.error("Error creating game:", error);
      socket.emit("error", { message: "Unable to create game" });
    }
  });

  // To Join Game

  socket.on("joinGame", async ({ sessionId, username }) => {
    console.log(`* User ${username} trying to join ${sessionId}`); // this is to check who is joining the session.

    try {
      const game = await Game.findOne({ sessionId });
      console.log("Game session found:", game); // this is to check if the game exists.

      if (!game) {
        console.log("Game session not found!");
        socket.emit("error", {
          message: "Cannot join this game session",
        });
        return;
      }

      if (game.status !== "waiting") {
        console.log("Game session already started");
        socket.emit("error", {
          message: "Game session already runnung!",
        });
        return;
      }

      if (game.players.some((player) => player.username === username)) {
        console.log("Username already exist in the this game session");
        socket.emit("error", { message: "Username already exists" });
        return;
      }

      game.players.push({ id: socket.id, username, score: 0, attempts: 5 }); 
      await game.save();

      console.log(`${username} added to the game! ${sessionId}`); // Adding a user/player to the game session

      

      // Notification to users in the game

      socket.join(sessionId);
      io.to(sessionId).emit("updatePlayers", game.players); // Emit all users/player in the session.
      socket.emit("gameJoined", { sessionId }); // This is to notify client or user that game was joined successfully.
    } catch (error) {
      console.error("Error joining game:", error);
      socket.emit("error", { message: " Cannot join game session" });
    }
  });

  // socket.emit("gameJoined", ({sessionId}) => {
  //   console.log("Joined game:", sessionId);
  // })

  // To Start Game

  socket.on("startGame", async ({ sessionId }) => {
    try {
      const game = await Game.findOne({ sessionId });

      if (!game || game.player.length < 2 || game.gameMaster !== socket.id) {
        socket.emit("error", { message: "Game session cannot start" });
        return;
      }

      game.status = "in_progress";
      const { question, answer } = await askGameMasterForQuestion(socket);
      game.question = question;
      game.answer = answer.toLowerCase();
      game.status = "in_progress";
      await game.save();
      io.to(sessionId).emit("gameStarted", { question });

      // Setting when game times out.
      setTimeout(async () => {
        io.to(sessionId).emit("gameEnded", {
          message: "Game ended! Start new game.",
          answer,
        });
        game.status = "waiting";
        game.gameMaster = game.players[1]?.id || game.gameMaster;
        await game.save();
      }, 120000); // This should be 2mins.
    } catch (error) {
      socket.emit("error", { message: "Internal server error" });
    }
  });

  // To Submit Game Guess

  socket.on("submitGuess", async ({ sessionId, username, guess }) => {
    try {
      const game = await Game.findOne({ sessionId });

      if (!game || game.status !== "in_progress") return;

      const player = game.players.find((p) => p.id === socket.id);
      if (!player || player.attempts <= 0) return;

      // const correctAnswer = game.answer;
      // const playerGuess = guess.toLowerCase();

      if (guess.toLowerCase() === game.answer) {
        player.score += 10;
        game.status = "waiting";
        // await game.save();

        io.to(sessionId).emit("gameEnded", {
          message: `${username} won!`,
          answer: game.answer,
        });
      } else {
        // When user or player guessed Wrong, Then reduce the number of attempts from the initial default of 5
        player.attempts -= 1;
        if (player.attempts === 0) {
          socket.emit("outOfAttempts", {
            message: "Limits exceeded for attempts",
          });
        } else {
          socket.emit("wrongGuess", { remainingAttempts: player.attempts });
        }
      }
      await game.save();

      io.to(sessionId).emit("updatePlayers", game.players); // Updating the users/players list
    } catch (error) {
      socket.emit("error", { message: "Internal server error" });
    }
  });

  // To check all players if attempts are finished

  // const allOutOfAttempts = game.players.every((p) => p.attempts === 0);
  // if (allOutOfAttempts) {
  //     game.status = "waiting";
  //     await game.save();

  //     io.to(sessionId).emit("gameEnded", {
  //         message: "Round over! guess wrongly by users",
  //         answer: correctAnswer,
  //     });
  // }

  // Implementing when user (Player) is Disconnected from Game

  socket.on("disconnect", async () => {
    try {
      const game = await Game.findOne({ "players.id": socket.id });

      if (game) {
        // If the user was just a player, remove them from the players list
        game.players = game.players.filter((player) => player.id !== socket.id);
        if (game.players.length === 0) {
          await Game.deleteOne({ sessionId: game.sessionId });
        } else {
          await game.save();
        }
      }
    } catch (error) {
      console.error("Error Handling disconnect:", error);
    }
  });
};

async function askGameMasterForQuestion(socket) {
  return new Promise((resolve) => {
    socket.emit("creationQuestion", {}, (response) => {
      resolve(response);
    });
  });
}
