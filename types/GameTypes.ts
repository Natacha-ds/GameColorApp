export interface GameLevel {
  id: number;
  name: string;
  timeLimit: number; // in seconds
  totalColors: number; // always 10
  availableColors: number; // 2 or 4
  hasDuplicates: boolean; // for levels 5-6
  description: string;
}

export interface GameState {
  currentLevel: number;
  score: number;
  timeRemaining: number;
  currentColorIndex: number;
  colorsToClick: string[];
  availableColors: string[];
  gameStatus: 'waiting' | 'playing' | 'paused' | 'completed' | 'failed';
  isGameActive: boolean;
}

export interface ColorButton {
  color: string;
  isActive: boolean;
  isCorrect: boolean;
  position: { x: number; y: number };
}

export const GAME_COLORS = {
  blue: '#4A90E2',
  green: '#7ED321',
  yellow: '#F5A623',
  red: '#D0021B',
} as const;

export type ColorName = keyof typeof GAME_COLORS;
