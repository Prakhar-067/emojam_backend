const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

// Game logic imports
const { 
  addPlayer, 
  removePlayer, 
  getPlayer, 
  getPlayersInRoom,
  createRoom,
  getRoomData,
  getAllRooms
} = require('./utils/players');

const { 
  startGame, 
  submitGuess, 
  getGameState,
  endRound,
  generateNewRound
} = require('./utils/game');

// Config
dotenv.config();
const app = express();
const server = http.createServer(app);

// CORS setup
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST']
}));

// Routes
app.get('/', (req, res) => {
  res.send('Emoji Charades Server is Running');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/rooms', (req, res) => {
  res.status(200).json({ rooms: getAllRooms() });
});

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ['GET', 'POST']
  }
});

// Helper: Log only in development
const devLog = (...args) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
};

// Handle connections
io.on('connection', (socket) => {
  devLog(`New connection: ${socket.id}`);

  // Join room
  socket.on('joinRoom', ({ username, room }) => {
    try {
      // Remove duplicate if player with this socket.id already exists
      removePlayer(socket.id);
      
      // Create room if it doesn't exist
      if (!getRoomData(room)) {
        createRoom(room);
      }
      
      const { player, error } = addPlayer({ id: socket.id, username, room });
      if (error) {
        return socket.emit('error', { message: error });
      }
      
      socket.join(room);
      
      socket.emit('message', { 
        user: 'system', 
        text: `Welcome to ${room}, ${username}!`,
        timestamp: new Date().toISOString()
      });
      
      socket.broadcast.to(room).emit('message', {
        user: 'system',
        text: `${username} has joined the game!`,
        timestamp: new Date().toISOString()
      });
      
      io.to(room).emit('roomData', {
        room,
        players: getPlayersInRoom(room)
      });
      
      const gameState = getGameState(room);
      socket.emit('gameState', gameState);
    } catch (err) {
      console.error('Error in joinRoom:', err);
      socket.emit('error', { message: 'An error occurred while joining the room.' });
    }
  });

  // Start game
  socket.on('startGame', () => {
    try {
      const player = getPlayer(socket.id);
      if (!player) return;
      
      // Prevent game start if already playing
      const currentState = getGameState(player.room);
      if (currentState && currentState.status === 'playing') {
        return;
      }
      
      const gameState = startGame(player.room);
      io.to(player.room).emit('gameState', gameState);
      io.to(player.room).emit('message', {
        user: 'system',
        text: 'Game is starting! Get ready to guess the emoji clues!',
        timestamp: new Date().toISOString()
      });
      
      // Countdown before game starts
      let countdown = 5;
      const countdownInterval = setInterval(() => {
        io.to(player.room).emit('countdown', { type: 'gameStart', seconds: countdown });
        countdown--;
        if (countdown < 0) {
          clearInterval(countdownInterval);
          runGameRounds(player.room, 1); // Start round 1
        }
      }, 1000);
    } catch (err) {
      console.error('Error in startGame:', err);
      socket.emit('error', { message: 'An error occurred while starting the game.' });
    }
  });

  // Recursive game round handler
  function runGameRounds(room, roundNumber) {
    if (roundNumber > 5) {
      io.to(room).emit('gameOver', {
        winners: getPlayersInRoom(room).sort((a, b) => b.score - a.score),
        gameState: getGameState(room)
      });
      return;
    }

    const gameState = getGameState(room);
  if (!gameState || !gameState.status) {
    startGame(room); // This initializes gameState with usedThemes etc.
  }
    
    const newRound = generateNewRound(room);
    io.to(room).emit('gameState', getGameState(room));
    io.to(room).emit('roundStart', newRound);
    
    let roundTimer = 30;
    const roundInterval = setInterval(() => {
      io.to(room).emit('countdown', { type: 'round', seconds: roundTimer });
      roundTimer--;
      if (roundTimer < 0) {
        clearInterval(roundInterval);
        const roundResults = endRound(room);
        io.to(room).emit('roundEnd', roundResults);
        io.to(room).emit('gameState', getGameState(room));
        
        // Break before next round
        setTimeout(() => {
          runGameRounds(room, roundNumber + 1);
        }, 10000);
      }
    }, 1000);
  }

  // Submit a guess
  socket.on('submitGuess', (guess) => {
    try {
      // Validate that guess is a string
      if (typeof guess !== 'string') return;
      const player = getPlayer(socket.id);
      if (!player) return;
      
      const { correct, score, answer } = submitGuess(player, guess);
      socket.emit('guessResult', { correct, score, answer });
      
      if (correct) {
        socket.broadcast.to(player.room).emit('message', {
          user: 'system',
          text: `${player.username} guessed correctly! (+${score} points)`,
          timestamp: new Date().toISOString()
        });
        socket.emit('message', {
          user: 'system',
          text: `You guessed "${answer}" correctly! (+${score} points)`,
          timestamp: new Date().toISOString()
        });
        io.to(player.room).emit('roomData', {
          room: player.room,
          players: getPlayersInRoom(player.room)
        });
      }
    } catch (err) {
      console.error('Error in submitGuess:', err);
      socket.emit('error', { message: 'An error occurred while submitting your guess.' });
    }
  });

  // Chat messages
  socket.on('sendMessage', (message) => {
    try {
      const player = getPlayer(socket.id);
      if (!player) return;
      
      const gameState = getGameState(player.room);
      if (gameState && gameState.status === 'playing' &&
          gameState.currentAnswer &&
          message.toLowerCase().includes(gameState.currentAnswer.toLowerCase())) {
        socket.emit('message', {
          user: 'system',
          text: 'Your message wasn\'t sent because it contains the answer!',
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      io.to(player.room).emit('message', {
        user: player.username,
        text: message,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error in sendMessage:', err);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    devLog(`Disconnected: ${socket.id}`);
    const player = getPlayer(socket.id);
    if (player) {
      removePlayer(socket.id);
      io.to(player.room).emit('message', {
        user: 'system',
        text: `${player.username} has left the game.`,
        timestamp: new Date().toISOString()
      });
      io.to(player.room).emit('roomData', {
        room: player.room,
        players: getPlayersInRoom(player.room)
      });
      
      // Optional: Clean up room if no players remain
      if (getPlayersInRoom(player.room).length === 0) {
        // For example: cleanupRoom(player.room);
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
