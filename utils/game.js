const { getPlayersInRoom, getRoomData } = require("./players");

// Game themes and puzzles
const themes = {
  movies: {
    name: "Movies",
    puzzles: [
      { emojis: "🧙‍♂️⚡👓🪄", answer: "harry potter" },
      { emojis: "👸❄️⛄", answer: "frozen" },
      { emojis: "🦁👑🌍", answer: "lion king" },
      { emojis: "🕷️🧑‍🦰🕸️", answer: "spiderman" },
      { emojis: "🚢💏❄️🌊", answer: "titanic" },
      { emojis: "👽☎️🏠", answer: "et" },
      { emojis: "🤖❤️🌱", answer: "wall-e" },
      { emojis: "🔍🐠", answer: "finding nemo" },
      { emojis: "🦖🏝️🧬", answer: "jurassic park" },
      { emojis: "⭐⚔️🌌", answer: "star wars" },
    ],
  },
  animals: {
    name: "Animals",
    puzzles: [
      { emojis: "🐘🧠🦇", answer: "elephant" },
      { emojis: "🦓⚫⚪", answer: "zebra" },
      { emojis: "🐒🍌🌴", answer: "monkey" },
      { emojis: "🦁♂️👑", answer: "lion" },
      { emojis: "🐅🔶⚫", answer: "tiger" },
      { emojis: "🐍🐍🐍", answer: "snake" },
      { emojis: "🦘🦘", answer: "kangaroo" },
      { emojis: "🦒🦒📏", answer: "giraffe" },
      { emojis: "🐬🌊🤿", answer: "dolphin" },
      { emojis: "🦉🌙🦉", answer: "owl" },
    ],
  },
  food: {
    name: "Food",
    puzzles: [
      { emojis: "🍕🧀", answer: "pizza" },
      { emojis: "🍔🥩🍟", answer: "hamburger" },
      { emojis: "🍣🐟", answer: "sushi" },
      { emojis: "🍝🍅", answer: "spaghetti" },
      { emojis: "🍦🥶🍨", answer: "ice cream" },
      { emojis: "🥐🧈", answer: "croissant" },
      { emojis: "🌮🌶️", answer: "taco" },
      { emojis: "🍗🍖🔥", answer: "barbecue" },
      { emojis: "🥗🥬🥒", answer: "salad" },
      { emojis: "🍰🎂🧁", answer: "cake" },
    ],
  },
  books: {
    name: "Books",
    puzzles: [
      { emojis: "🧙‍♂️💍🌋", answer: "lord of the rings" },
      { emojis: "🐷👨‍👩‍👧‍👦🏠", answer: "three little pigs" },
      { emojis: "🕷️🐖📚", answer: "charlotte's web" },
      { emojis: "🐯🧒🛶", answer: "life of pi" },
      { emojis: "🐋🧔‍♂️🌊", answer: "moby dick" },
      { emojis: "👸👑🥀", answer: "beauty and the beast" },
      { emojis: "🐛🍎🦋", answer: "the very hungry caterpillar" },
      { emojis: "👧🍄🐰", answer: "alice in wonderland" },
      { emojis: "👦⚡️🧙‍♂️", answer: "harry potter" },
      { emojis: "🏠🌪️🌈", answer: "wizard of oz" },
    ],
  },
  cities: {
    name: "Cities",
    puzzles: [
      { emojis: "🗽🍎🏙️", answer: "new york" },
      { emojis: "🗼🥖", answer: "paris" },
      { emojis: "🏯🌸", answer: "tokyo" },
      { emojis: "🏛️🍝", answer: "rome" },
      { emojis: "⛩️🍣🗾", answer: "kyoto" },
      { emojis: "🎭☕🚲", answer: "amsterdam" },
      { emojis: "🏙️🏝️🏖️", answer: "miami" },
      { emojis: "🕌🏜️🏢", answer: "dubai" },
      { emojis: "🇬🇧👑☂️", answer: "london" },
      { emojis: "🌉🌁🌇", answer: "san francisco" },
    ],
  },
};

const MAX_SCORE = 100;
const MIN_SCORE = 10;
const ROUND_TIME = 30;

const getUnusedTheme = (room) => {
  const allThemes = Object.keys(themes);
  const usedThemes = room.gameState.usedThemes || [];

  const availableThemes = allThemes.filter(
    (theme) => !usedThemes.includes(theme)
  );
  if (availableThemes.length === 0) return null;

  const selected =
    availableThemes[Math.floor(Math.random() * availableThemes.length)];

  room.gameState.usedThemes.push(selected);
  return selected;
};

const getUnusedPuzzle = (room, themeKey) => {
  if (!room.gameState.usedPuzzles) room.gameState.usedPuzzles = {};
  if (!room.gameState.usedPuzzles[themeKey])
    room.gameState.usedPuzzles[themeKey] = [];

  const allPuzzles = themes[themeKey].puzzles;
  const usedIndices = room.gameState.usedPuzzles[themeKey];
  const availableIndices = allPuzzles
    .map((_, index) => index)
    .filter((index) => !usedIndices.includes(index));

  if (availableIndices.length === 0) return null;

  const selectedIndex =
    availableIndices[Math.floor(Math.random() * availableIndices.length)];
  room.gameState.usedPuzzles[themeKey].push(selectedIndex);

  return allPuzzles[selectedIndex];
};

const startGame = (roomName) => {
  const room = getRoomData(roomName);
  if (!room) return null;

  room.gameState = {
    status: "starting",
    currentRound: 0,
    totalRounds: 5,
    theme: null,
    emojiClues: [],
    currentAnswer: null,
    startTime: new Date().toISOString(),
    roundStartTime: null,
    correctGuessers: [],
    usedThemes: [],
    usedPuzzles: {},
  };

  return room.gameState;
};

const generateNewRound = (roomName) => {
  const room = getRoomData(roomName);
  if (!room || room.gameState.status === "finished") return null;

  const themeKey = getUnusedTheme(room);
  if (!themeKey) return null;

  const puzzle = getUnusedPuzzle(room, themeKey);
  if (!puzzle) return null;

  room.gameState.status = "playing";
  room.gameState.currentRound += 1;
  room.gameState.theme = themes[themeKey].name;
  room.gameState.emojiClues = puzzle.emojis;
  room.gameState.currentAnswer = puzzle.answer;
  room.gameState.roundStartTime = new Date().toISOString();
  room.gameState.correctGuessers = [];

  return {
    round: room.gameState.currentRound,
    totalRounds: room.gameState.totalRounds,
    theme: room.gameState.theme,
    emojiClues: room.gameState.emojiClues,
  };
};

const submitGuess = (player, guess) => {
  if (!player) return { correct: false, score: 0 };

  const room = getRoomData(player.room);
  if (!room || room.gameState.status !== "playing")
    return { correct: false, score: 0 };

  if (room.gameState.correctGuessers.includes(player.id)) {
    return {
      correct: false,
      score: 0,
      message: "You've already guessed correctly for this round.",
    };
  }

  const isCorrect =
    guess.trim().toLowerCase() === room.gameState.currentAnswer.toLowerCase();

  if (isCorrect) {
    const roundStart = new Date(room.gameState.roundStartTime).getTime();
    const now = Date.now();
    const timeTaken = (now - roundStart) / 1000;
    const timeRatio = Math.min(1, timeTaken / ROUND_TIME);
    const score = Math.max(
      MIN_SCORE,
      Math.floor(MAX_SCORE - (MAX_SCORE - MIN_SCORE) * timeRatio)
    );

    const players = getPlayersInRoom(player.room);
    const foundPlayer = players.find((p) => p.id === player.id);
    if (foundPlayer) {
      foundPlayer.score += score;
      foundPlayer.correctGuesses += 1;
    }

    room.gameState.correctGuessers.push(player.id);

    return {
      correct: true,
      score,
      answer: room.gameState.currentAnswer,
    };
  }

  return { correct: false, score: 0 };
};

const endRound = (roomName) => {
  const room = getRoomData(roomName);
  if (!room) return null;

  const players = getPlayersInRoom(roomName);

  const results = {
    round: room.gameState.currentRound,
    theme: room.gameState.theme,
    emojiClues: room.gameState.emojiClues,
    answer: room.gameState.currentAnswer,
    correctGuessers: room.gameState.correctGuessers.length,
    players: players.sort((a, b) => b.score - a.score),
  };

  room.gameState.status =
    room.gameState.currentRound >= room.gameState.totalRounds
      ? "finished"
      : "intermission";

  return results;
};

const getGameState = (roomName) => {
  const room = getRoomData(roomName);
  if (!room) return null;

  return {
    ...room.gameState,
    currentAnswer:
      room.gameState.status === "finished"
        ? room.gameState.currentAnswer
        : undefined,
  };
};

module.exports = {
  startGame,
  generateNewRound,
  submitGuess,
  endRound,
  getGameState,
};
