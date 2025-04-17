// // Player and room management

// // Data stores
// const players = [];
// const rooms = {};

// // Player management
// const addPlayer = ({ id, username, room }) => {
//   // Clean the data
//   username = username.trim().toLowerCase();
//   room = room.trim().toLowerCase();

//   // Validate data
//   if (!username || !room) {
//     return { error: 'Username and room are required.' };
//   }

//   // Check for existing user with same name in the room
//   const existingPlayer = players.find(
//     (player) => player.room === room && player.username === username
//   );

//   if (existingPlayer) {
//     return { error: 'Username is already taken in this room.' };
//   }

//   // Create player
//   const player = { id, username, room, score: 0, correctGuesses: 0 };
//   players.push(player);

//   return { player };
// };

// const removePlayer = (id) => {
//     const index = players.findIndex((player) => player.id === id);
//     if (index !== -1) {
//       const removed = players.splice(index, 1)[0];
//       const playersLeft = getPlayersInRoom(removed.room);
//       if (playersLeft.length === 0) {
//         delete rooms[removed.room]; // Clean up empty room
//       }
//       return removed;
//     }
//   };
  
// const getPlayer = (id) => {
//   return players.find((player) => player.id === id);
// };

// const getPlayersInRoom = (room) => {
//   return players.filter((player) => player.room === room);
// };

// // Room management
// const createRoom = (roomName) => {
//   if (!rooms[roomName]) {
//     rooms[roomName] = {
//       name: roomName,
//       created: new Date().toISOString(),
//       gameState: {
//         status: 'waiting', // 'waiting', 'playing', 'finished'
//         currentRound: 0,
//         totalRounds: 5,
//         theme: null,
//         emojiClues: [],
//         currentAnswer: null,
//         startTime: null,
//         roundStartTime: null,
//         correctGuessers: []
//       }
//     };
//   }
//   return rooms[roomName];
// };

// const getRoomData = (roomName) => {
//   return rooms[roomName];
// };

// const getAllRooms = () => {
//   return Object.keys(rooms).map(key => ({
//     name: rooms[key].name,
//     playerCount: getPlayersInRoom(key).length,
//     status: rooms[key].gameState.status
//   }));
// };

// module.exports = {
//   addPlayer,
//   removePlayer,
//   getPlayer,
//   getPlayersInRoom,
//   createRoom,
//   getRoomData,
//   getAllRooms
// };

// Player and room management

// Data stores
const players = [];
const rooms = {};
const MAX_PLAYERS_PER_ROOM = 10; // Optional: set your max room size

// Player management
const addPlayer = ({ id, username, room }) => {
  // Clean the data
  username = username.trim().toLowerCase();
  room = room.trim().toLowerCase();

  // Validate data
  if (!username || !room) {
    return { error: 'Username and room are required.' };
  }

  // Check for existing user with same name in the room
  const existingPlayer = players.find(
    (player) => player.room === room && player.username === username
  );

  if (existingPlayer) {
    return { error: 'Username is already taken in this room.' };
  }

  // Check for room capacity
  if (getPlayersInRoom(room).length >= MAX_PLAYERS_PER_ROOM) {
    return { error: 'Room is full.' };
  }

  // Create player
  const player = {
    id,
    username,
    room,
    score: 0,
    correctGuesses: 0,
    joinedAt: Date.now() // Optional timestamp
  };

  players.push(player);
  return { player };
};

const removePlayer = (id) => {
  const index = players.findIndex((player) => player.id === id);

  if (index !== -1) {
    const removedPlayer = players.splice(index, 1)[0];

    // Auto-clean the room if no players left
    const playersLeft = getPlayersInRoom(removedPlayer.room);
    if (playersLeft.length === 0) {
      delete rooms[removedPlayer.room];
    }

    return removedPlayer;
  }
};

const getPlayer = (id) => {
  return players.find((player) => player.id === id);
};

const getPlayersInRoom = (room) => {
  room = room.trim().toLowerCase();
  return players.filter((player) => player.room === room);
};

// Room management
const createRoom = (roomName) => {
  roomName = roomName.trim().toLowerCase();

  if (!rooms[roomName]) {
    rooms[roomName] = {
      name: roomName,
      created: new Date().toISOString(),
      gameState: {
        status: 'waiting', // 'waiting', 'playing', 'finished'
        currentRound: 0,
        totalRounds: 5,
        theme: null,
        emojiClues: [],
        currentAnswer: null,
        startTime: null,
        roundStartTime: null,
        correctGuessers: []
      }
    };
  }

  return rooms[roomName];
};

const getRoomData = (roomName) => {
  roomName = roomName.trim().toLowerCase();
  return rooms[roomName];
};

const getAllRooms = () => {
  return Object.keys(rooms).map((key) => ({
    name: rooms[key].name,
    playerCount: getPlayersInRoom(key).length,
    status: rooms[key].gameState.status
  }));
};

module.exports = {
  addPlayer,
  removePlayer,
  getPlayer,
  getPlayersInRoom,
  createRoom,
  getRoomData,
  getAllRooms
};
