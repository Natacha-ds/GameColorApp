import { useState, useEffect, useCallback } from 'react';
import { GameState, ColorName, GAME_COLORS } from '../types/GameTypes';
import { GAME_LEVELS } from '../data/GameLevels';
import * as Speech from 'expo-speech';

const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameState>({
    currentLevel: 1,
    score: 0,
    timeRemaining: 0,
    currentColorIndex: 0,
    colorsToClick: [],
    availableColors: [],
    gameStatus: 'waiting',
    isGameActive: false,
  });

  const generateColorSequence = useCallback((level: number) => {
    const levelData = GAME_LEVELS[level - 1];
    const colorNames = Object.keys(GAME_COLORS) as ColorName[];
    
    // Select available colors based on level
    let availableColors: ColorName[];
    if (levelData.availableColors === 2) {
      availableColors = colorNames.slice(0, 2);
    } else {
      availableColors = [...colorNames];
    }

    // Generate 10 random colors from available colors
    const sequence: ColorName[] = [];
    for (let i = 0; i < 10; i++) {
      const randomIndex = Math.floor(Math.random() * availableColors.length);
      sequence.push(availableColors[randomIndex]);
    }

    return { sequence, availableColors };
  }, []);

  const startLevel = useCallback((level: number) => {
    const levelData = GAME_LEVELS[level - 1];
    const { sequence, availableColors } = generateColorSequence(level);
    
    setGameState(prev => ({
      ...prev,
      currentLevel: level,
      timeRemaining: levelData.timeLimit,
      colorsToClick: sequence,
      availableColors,
      currentColorIndex: 0,
      gameStatus: 'playing',
      isGameActive: true,
    }));

    // Start speaking the first color immediately
    setTimeout(() => {
      speakColor(sequence[0]);
    }, 1000);
  }, [generateColorSequence, speakColor]);

  const speakColor = useCallback(async (color: string) => {
    try {
      await Speech.speak(color, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.8,
      });
    } catch (error) {
      console.log('Speech error:', error);
    }
  }, []);

  const handleColorClick = useCallback((clickedColor: ColorName) => {
    if (gameState.gameStatus !== 'playing') return;

    const currentColor = gameState.colorsToClick[gameState.currentColorIndex];
    const isCorrect = clickedColor !== currentColor;

    if (isCorrect) {
      // Correct click - move to next color
      const newIndex = gameState.currentColorIndex + 1;
      if (newIndex >= gameState.colorsToClick.length) {
        // Level completed!
        const timeBonus = Math.floor(gameState.timeRemaining * 10);
        setGameState(prev => ({
          ...prev,
          score: prev.score + 100 + timeBonus,
          gameStatus: 'completed',
          isGameActive: false,
        }));
      } else {
        setGameState(prev => ({
          ...prev,
          currentColorIndex: newIndex,
        }));
        // Speak next color
        speakColor(gameState.colorsToClick[newIndex]);
      }
    } else {
      // Wrong click - game over
      setGameState(prev => ({
        ...prev,
        gameStatus: 'failed',
        isGameActive: false,
      }));
    }
  }, [gameState, speakColor]);

  const resetGame = useCallback(() => {
    setGameState({
      currentLevel: 1,
      score: 0,
      timeRemaining: 0,
      currentColorIndex: 0,
      colorsToClick: [],
      availableColors: [],
      gameStatus: 'waiting',
      isGameActive: false,
    });
  }, []);

  // Timer effect
  useEffect(() => {
    if (gameState.isGameActive && gameState.timeRemaining > 0) {
      const timer = setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          timeRemaining: prev.timeRemaining - 1,
        }));
      }, 1000);

      return () => clearTimeout(timer);
    } else if (gameState.isGameActive && gameState.timeRemaining === 0) {
      // Time's up - game over
      setGameState(prev => ({
        ...prev,
        gameStatus: 'failed',
        isGameActive: false,
      }));
    }
  }, [gameState.isGameActive, gameState.timeRemaining]);

  return {
    gameState,
    startLevel,
    handleColorClick,
    resetGame,
    speakColor,
  };
};

export default useGameLogic;
