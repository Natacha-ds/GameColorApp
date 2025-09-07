import { GameLevel } from '../types/GameTypes';

export const GAME_LEVELS: GameLevel[] = [
  {
    id: 1,
    name: "Level 1 - Easy Start",
    timeLimit: 40,
    totalColors: 10,
    availableColors: 2,
    hasDuplicates: false,
    description: "40 seconds, 2 colors, click the wrong one!"
  },
  {
    id: 2,
    name: "Level 2 - More Colors",
    timeLimit: 40,
    totalColors: 10,
    availableColors: 4,
    hasDuplicates: false,
    description: "40 seconds, 4 colors, click the wrong one!"
  },
  {
    id: 3,
    name: "Level 3 - Speed Challenge",
    timeLimit: 30,
    totalColors: 10,
    availableColors: 2,
    hasDuplicates: false,
    description: "30 seconds, 2 colors, click the wrong one!"
  },
  {
    id: 4,
    name: "Level 4 - Full Speed",
    timeLimit: 30,
    totalColors: 10,
    availableColors: 4,
    hasDuplicates: false,
    description: "30 seconds, 4 colors, click the wrong one!"
  },
  {
    id: 5,
    name: "Level 5 - Duplicate Challenge",
    timeLimit: 40,
    totalColors: 10,
    availableColors: 4,
    hasDuplicates: true,
    description: "40 seconds, 4 colors with duplicates, click the wrong one!"
  },
  {
    id: 6,
    name: "Level 6 - Master Challenge",
    timeLimit: 30,
    totalColors: 10,
    availableColors: 4,
    hasDuplicates: true,
    description: "30 seconds, 4 colors with duplicates, click the wrong one!"
  }
];
