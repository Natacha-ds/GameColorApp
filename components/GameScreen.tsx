import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';

// Mobile viewport dimensions (iPhone-like)
const MOBILE_WIDTH = 375;
const MOBILE_HEIGHT = 750;
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Calculate scale factor to fit mobile viewport
const scaleX = screenWidth / MOBILE_WIDTH;
const scaleY = screenHeight / MOBILE_HEIGHT;
const scale = Math.min(scaleX, scaleY);

const width = MOBILE_WIDTH;

const GAME_COLORS = {
  blue: '#4A90E2',
  green: '#7ED321',
  yellow: '#F5A623',
  red: '#D0021B',
} as const;

type ColorName = keyof typeof GAME_COLORS;

const GameScreen: React.FC = () => {
  const [gameState, setGameState] = useState({
    currentLevel: 1,
    score: 0,
    lives: 3,
    timeRemaining: 0,
    currentColorIndex: 0,
    colorsToClick: [] as ColorName[],
    availableColors: [] as ColorName[],
    gameStatus: 'homepage' as 'homepage' | 'waiting' | 'playing' | 'completed' | 'failed' | 'levelSummary',
    isGameActive: false,
    levelStartTime: 0,
    levelTimeLimit: 0,
    levelScore: 0,
    levelSummary: { base: 0, time: 0, total: 0 },
    unlockedLevels: [1], // Start with only Level 1 unlocked
    visualColors: [] as ColorName[], // Colors displayed on screen (for Level 5 mechanic)
    isTransitioning: false, // Prevent double clicks during grid refresh
    lastArrangement: [] as ColorName[], // Track last arrangement to prevent repeats on L1-2
  });

  const generateColorSequence = (level: number) => {
    const colorNames = Object.keys(GAME_COLORS) as ColorName[];
    
    // Determine number of colors based on level
    let numColors: number;
    if (level <= 2) {
      numColors = 2; // Level 1 & 2: 2 colors (Blue, Green)
    } else {
      numColors = 4; // Level 3+: 4 colors (Blue, Green, Yellow, Red)
    }
    
    const availableColors = colorNames.slice(0, numColors);
    const sequence: ColorName[] = [];
    
    // Generate sequence with no more than 4 consecutive same colors
    for (let i = 0; i < 10; i++) {
      let newColor: ColorName;
      let attempts = 0;
      
      do {
        const randomIndex = Math.floor(Math.random() * availableColors.length);
        newColor = availableColors[randomIndex];
        attempts++;
        
        // If we've tried too many times, just pick any color
        if (attempts > 10) break;
      } while (
        i >= 3 && // Only check after we have at least 4 colors
        sequence[i-1] === newColor &&
        sequence[i-2] === newColor &&
        sequence[i-3] === newColor
      );
      
      sequence.push(newColor);
    }
    
    return { sequence, availableColors };
  };

  // Shuffle array function
  const shuffleArray = (array: ColorName[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const generateVisualColors = (level: number, currentColor: ColorName, lastArrangement: ColorName[] = []) => {
    const colorNames = Object.keys(GAME_COLORS) as ColorName[];
    
    let colors: ColorName[];
    
    if (level <= 2) {
      // Level 1 & 2: 2 colors (Blue, Green)
      colors = colorNames.slice(0, 2);
    } else if (level <= 4) {
      // Level 3 & 4: 4 colors (Blue, Green, Yellow, Red)
      colors = colorNames.slice(0, 4);
    } else if (level === 5) {
      // Level 5: 4 squares, but 2 are the forbidden color, 2 are different
      const forbiddenColor = currentColor;
      const otherColors = colorNames.slice(0, 4).filter(color => color !== forbiddenColor);
      
      // Ensure we have exactly 2 different colors from the remaining 3
      const color1 = otherColors[0];
      const color2 = otherColors[1];
      
      colors = [forbiddenColor, forbiddenColor, color1, color2];
    } else {
      // Level 6+: Default to 4 colors
      colors = colorNames.slice(0, 4);
    }
    
    // For Levels 1-2, prevent consecutive identical arrangements
    if (level <= 2) {
      let shuffledColors: ColorName[];
      let attempts = 0;
      
      do {
        shuffledColors = shuffleArray(colors);
        attempts++;
      } while (
        attempts < 10 && // Prevent infinite loop
        lastArrangement.length > 0 && 
        JSON.stringify(shuffledColors) === JSON.stringify(lastArrangement)
      );
      
      return shuffledColors;
    }
    
    // For other levels, just shuffle normally
    return shuffleArray(colors);
  };

  const speakColor = async (color: string) => {
    try {
      await Speech.speak(color, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.8,
      });
    } catch (error) {
      console.log('Speech error:', error);
    }
  };

  const startLevel = (level: number) => {
    const { sequence, availableColors } = generateColorSequence(level);
    // Custom timing per level
    const timeLimits = [0, 20, 15, 20, 15, 15, 5]; // Level 1: 20s, Level 2: 15s, Level 3: 20s, Level 4: 15s, Level 5: 15s, etc.
    const timeLimit = timeLimits[level] || 5;
    const startTime = Date.now();
    
    // Generate initial visual colors
    const initialVisualColors = generateVisualColors(level, sequence[0], []);
    
    setGameState(prev => ({
      ...prev,
      currentLevel: level,
      timeRemaining: timeLimit,
      colorsToClick: sequence,
      availableColors,
      visualColors: initialVisualColors,
      lastArrangement: initialVisualColors,
      currentColorIndex: 0,
      gameStatus: 'playing',
      isGameActive: true,
      levelStartTime: startTime,
      levelTimeLimit: timeLimit,
      levelScore: 0,
    }));

    // Start speaking the first color after a delay
    setTimeout(() => {
      speakColor(sequence[0]);
    }, 1000);
  };

  const handleColorClick = (clickedColor: ColorName) => {
    if (gameState.gameStatus !== 'playing' || gameState.isTransitioning) return;

    const currentColor = gameState.colorsToClick[gameState.currentColorIndex];
    const isCorrect = clickedColor !== currentColor;

    if (isCorrect) {
      // Correct click - move to next color
      const newIndex = gameState.currentColorIndex + 1;
      if (newIndex >= gameState.colorsToClick.length) {
        // Level completed! Calculate score with accurate timing
        const elapsedTime = (Date.now() - gameState.levelStartTime) / 1000; // in seconds
        const actualTimeRemaining = Math.max(0, gameState.levelTimeLimit - elapsedTime);
        const baseScore = 100; // 10 points per color × 10 colors
        const timeBonus = Math.floor(actualTimeRemaining) * 10;
        const totalLevelScore = baseScore + timeBonus;
        
        // Unlock next level if not already unlocked
        const nextLevel = gameState.currentLevel + 1;
        const newUnlockedLevels = [...gameState.unlockedLevels];
        if (nextLevel <= 6 && !newUnlockedLevels.includes(nextLevel)) {
          newUnlockedLevels.push(nextLevel);
        }
        
        setGameState(prev => ({
          ...prev,
          score: prev.score + totalLevelScore,
          levelScore: totalLevelScore,
          levelSummary: { base: baseScore, time: timeBonus, total: totalLevelScore },
          gameStatus: 'levelSummary',
          isGameActive: false,
          unlockedLevels: newUnlockedLevels,
        }));
      } else {
        // Set transitioning state to prevent double clicks
        setGameState(prev => ({
          ...prev,
          isTransitioning: true,
        }));
        
        // Refresh grid for all levels when moving to next color
        const newVisualColors = generateVisualColors(gameState.currentLevel, gameState.colorsToClick[newIndex], gameState.lastArrangement);
          
        setGameState(prev => ({
          ...prev,
          currentColorIndex: newIndex,
          visualColors: newVisualColors,
          lastArrangement: newVisualColors, // Update last arrangement
          isTransitioning: false, // Re-enable clicks after grid refresh
        }));
        // Speak next color
        speakColor(gameState.colorsToClick[newIndex]);
      }
    } else {
      // Wrong click - lose life and points
      const newScore = Math.max(0, gameState.score - 10);
      const newLives = gameState.lives - 1;
      
      if (newScore <= 0 || newLives <= 0) {
        // Game Over - reset everything
        setGameState(prev => ({
          ...prev,
          score: 0,
          lives: 3,
          currentLevel: 1,
          gameStatus: 'failed',
          isGameActive: false,
          levelSummary: { base: 0, time: 0, total: -10 },
        }));
      } else {
        // Lose life but retry same level
        setGameState(prev => ({
          ...prev,
          score: newScore,
          lives: newLives,
          gameStatus: 'levelSummary',
          isGameActive: false,
          levelSummary: { base: 0, time: 0, total: -10 },
        }));
      }
    }
  };

  const resetGame = () => {
    setGameState(prev => ({
      currentLevel: 1,
      score: 0,
      lives: 3,
      timeRemaining: 0,
      currentColorIndex: 0,
      colorsToClick: [],
      availableColors: [],
      visualColors: [],
      gameStatus: 'homepage',
      isGameActive: false,
      levelStartTime: 0,
      levelTimeLimit: 0,
      levelScore: 0,
      levelSummary: { base: 0, time: 0, total: 0 },
      unlockedLevels: prev.unlockedLevels, // Preserve unlocked levels
      isTransitioning: false,
      lastArrangement: [],
    }));
  };

  const continueToNextLevel = () => {
    startLevel(gameState.currentLevel + 1);
  };

  const retryLevel = () => {
    startLevel(gameState.currentLevel);
  };

  const startGameFromHomepage = () => {
    setGameState(prev => ({
      ...prev,
      currentLevel: 1,
      score: 0,
      lives: 3,
      gameStatus: 'waiting',
    }));
  };

  const startGameAtLevel = (level: number) => {
    // Only allow starting unlocked levels
    if (!gameState.unlockedLevels.includes(level)) {
      return; // Do nothing if level is locked
    }
    
    // Start the level directly without going through waiting screen
    startLevel(level);
  };

  const returnToHomepage = () => {
    setGameState(prev => ({
      ...prev,
      gameStatus: 'homepage',
      isGameActive: false,
      timeRemaining: 0,
      currentColorIndex: 0,
      colorsToClick: [],
      availableColors: [],
      visualColors: [],
      isTransitioning: false,
      lastArrangement: [],
    }));
  };



  // Timer effect - update display every 100ms for accuracy
  useEffect(() => {
    if (gameState.isGameActive) {
      const timer = setInterval(() => {
        const elapsedTime = (Date.now() - gameState.levelStartTime) / 1000;
        const remainingTime = Math.max(0, gameState.levelTimeLimit - elapsedTime);
        
        setGameState(prev => ({
          ...prev,
          timeRemaining: Math.ceil(remainingTime),
        }));
        
        if (remainingTime <= 0) {
          // Time's up - lose life and retry
          const newScore = Math.max(0, gameState.score - 10);
          const newLives = gameState.lives - 1;
          
          if (newScore <= 0 || newLives <= 0) {
            // Game Over
            setGameState(prev => ({
              ...prev,
              score: 0,
              lives: 3,
              currentLevel: 1,
              gameStatus: 'failed',
              isGameActive: false,
            }));
          } else {
            // Lose life but retry same level
            setGameState(prev => ({
              ...prev,
              score: newScore,
              lives: newLives,
              gameStatus: 'levelSummary',
              isGameActive: false,
              levelSummary: { base: 0, time: 0, total: -10 },
            }));
          }
        }
      }, 100);

      return () => clearInterval(timer);
    }
  }, [gameState.isGameActive, gameState.levelStartTime, gameState.levelTimeLimit, gameState.score, gameState.lives]);

  const renderColorButton = (colorName: ColorName, index: number) => {
    return (
      <TouchableOpacity
        key={index} // Use index as key to handle duplicate colors in Level 5
        style={[
          styles.colorButton,
          {
            backgroundColor: GAME_COLORS[colorName],
          }
        ]}
        onPress={() => handleColorClick(colorName)}
        disabled={gameState.gameStatus !== 'playing' || gameState.isTransitioning}
      />
    );
  };

  const renderHomepage = () => {
    return (
      <View style={styles.homepageContainer}>
        <View style={styles.introSection}>
          <Text style={styles.readyText}>Ready to play?</Text>
          <Text style={styles.instructionText}>
            You'll hear a color. Do NOT select it. If you do, you lose!
          </Text>
        </View>
        
        <View style={styles.ctaSection}>
          <TouchableOpacity style={styles.startButton} onPress={startGameFromHomepage}>
            <Text style={styles.buttonText}>START GAME</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.levelSelector}>
          <Text style={styles.levelSelectorTitle}>Or choose a level:</Text>
          <View style={styles.levelGrid}>
            {[1, 2, 3, 4, 5, 6].map((level) => {
              const isUnlocked = gameState.unlockedLevels.includes(level);
              return (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.levelButton,
                    !isUnlocked && styles.levelButtonLocked
                  ]}
                  onPress={() => startGameAtLevel(level)}
                  disabled={!isUnlocked}
                >
                  <Text style={[
                    styles.levelButtonText,
                    !isUnlocked && styles.levelButtonTextLocked
                  ]}>
                    {isUnlocked ? `Level ${level}` : '🔒'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  const renderGameStatus = () => {
    switch (gameState.gameStatus) {
      case 'homepage':
        return renderHomepage();
      case 'waiting':
        return (
          <View style={styles.startContainer}>
            <Text style={styles.readyText}>Ready to play?</Text>
            <Text style={styles.instructionText}>
              You'll hear a color. Do NOT select it. If you do, you lose!
            </Text>
            <TouchableOpacity style={styles.startButton} onPress={() => startLevel(1)}>
              <Text style={styles.buttonText}>START GAME</Text>
            </TouchableOpacity>
          </View>
        );
      case 'playing':
        return (
          <View>
            <Text style={styles.statusText}>
              Level {gameState.currentLevel} - Time: {gameState.timeRemaining}s
            </Text>
          </View>
        );
      case 'levelSummary':
        const isWin = gameState.levelSummary.total > 0;
        return (
          <View style={[styles.levelSummaryContainer, isWin ? styles.winContainer : styles.lossContainer]}>
            <Text style={styles.levelSummaryTitle}>
              {isWin ? `Level ${gameState.currentLevel} Complete!` : `Level ${gameState.currentLevel} Failed!`}
            </Text>
            <View style={styles.pointsBreakdown}>
              {isWin ? (
                <>
                  <Text style={styles.pointsText}>✅ 10 colors found = +{gameState.levelSummary.base} pts</Text>
                  <Text style={styles.pointsText}>⏱️ +{gameState.levelSummary.time/10}s saved = +{gameState.levelSummary.time} pts</Text>
                  <Text style={styles.totalPointsText}>🏆 TOTAL = +{gameState.levelSummary.total} pts</Text>
                </>
              ) : (
                <>
                  <Text style={styles.pointsText}>❌ Wrong color = –10 pts</Text>
                  <Text style={styles.totalPointsText}>🔻 TOTAL = –10 pts</Text>
                </>
              )}
            </View>
            <TouchableOpacity 
              style={isWin ? styles.nextButton : styles.retryButton} 
              onPress={isWin ? continueToNextLevel : retryLevel}
            >
              <Text style={styles.buttonText}>{isWin ? 'Next Level' : 'Retry Level'}</Text>
            </TouchableOpacity>
            <Text style={styles.tapToContinue}>Tap to continue</Text>
          </View>
        );
      case 'failed':
        return (
          <View style={styles.failedContainer}>
            <Text style={styles.failedText}>GAME OVER</Text>
            <Text style={styles.scoreText}>Final Score: {gameState.score}</Text>
            <TouchableOpacity style={styles.restartButton} onPress={returnToHomepage}>
              <Text style={styles.buttonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.mobileViewport}>
      <LinearGradient
        colors={['#1e3c72', '#2a5298', '#667eea', '#764ba2']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          {/* Home button - only show during gameplay */}
          {gameState.gameStatus === 'playing' && (
            <TouchableOpacity style={styles.homeButton} onPress={returnToHomepage}>
              <Text style={styles.homeIcon}>🏠</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Don't Pick It!</Text>
          <Text style={styles.subtitle}>Train your brain to go against instinct.</Text>
        </View>

        <View style={styles.gameArea}>
          {/* Lives and Score Display */}
          {gameState.gameStatus === 'playing' && (
            <View style={styles.topBar}>
              <View style={styles.livesContainer}>
                {[1, 2, 3].map((life) => (
                  <Text key={life} style={[
                    styles.heart,
                    life > gameState.lives && styles.heartLost
                  ]}>
                    {life <= gameState.lives ? '♥' : '♡'}
                  </Text>
                ))}
              </View>
              <Text style={styles.scoreText}>Score: {gameState.score}</Text>
            </View>
          )}
          
          {renderGameStatus()}
          
          {/* Only show color grid when playing the game */}
          {gameState.gameStatus === 'playing' && (
            <View style={styles.colorGrid}>
              {gameState.visualColors.map((colorName, index) => 
                renderColorButton(colorName, index)
              )}
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  mobileViewport: {
    width: MOBILE_WIDTH,
    height: MOBILE_HEIGHT,
    alignSelf: 'center',
    marginTop: (screenHeight - MOBILE_HEIGHT * scale) / 2,
    transform: [{ scale }],
    transformOrigin: 'top center',
  },
  container: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 5,
    paddingHorizontal: 20,
    height: 60,
    position: 'relative',
  },
  homeButton: {
    position: 'absolute',
    top: 0,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  homeIcon: {
    fontSize: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  gameArea: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    maxHeight: 500,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  livesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heart: {
    fontSize: 24,
    color: '#FF6B6B',
    marginRight: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  heartLost: {
    color: '#666666',
    opacity: 0.5,
  },
  levelSummaryContainer: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 20,
    borderRadius: 15,
    borderWidth: 2,
  },
  winContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  lossContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderColor: 'rgba(244, 67, 54, 0.3)',
  },
  levelSummaryTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  pointsBreakdown: {
    alignItems: 'center',
    marginBottom: 15,
  },
  pointsText: {
    fontSize: 16,
    color: 'white',
    marginBottom: 5,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  totalPointsText: {
    fontSize: 18,
    color: '#FFD700',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  retryButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    shadowColor: '#F44336',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  tapToContinue: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
    fontStyle: 'italic',
  },
  statusText: {
    fontSize: 22,
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  instructionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  readyText: {
    fontSize: 20,
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  startContainer: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 20,
    height: 280,
    width: '100%',
  },
  colorButton: {
    width: width * 0.35,
    height: width * 0.35,
    borderRadius: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  completedContainer: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 30,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  completedText: {
    fontSize: 32,
    color: '#4CAF50',
    fontWeight: '800',
    marginBottom: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  failedContainer: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    padding: 30,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(244, 67, 54, 0.3)',
  },
  failedText: {
    fontSize: 32,
    color: '#F44336',
    fontWeight: '800',
    marginBottom: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  scoreText: {
    fontSize: 22,
    color: 'white',
    marginBottom: 25,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 30,
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  restartButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 30,
    shadowColor: '#F44336',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  homepageContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  introSection: {
    alignItems: 'center',
    marginBottom: 10,
  },
  ctaSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginVertical: 30,
  },
  levelSelector: {
    alignItems: 'center',
    marginTop: 20,
  },
  levelSelectorTitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 15,
    textAlign: 'center',
  },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
  },
  levelButton: {
    width: width * 0.25,
    height: width * 0.25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
    margin: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  levelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  levelButtonLocked: {
    backgroundColor: 'rgba(100, 100, 100, 0.3)',
    borderColor: 'rgba(150, 150, 150, 0.3)',
    opacity: 0.6,
  },
  levelButtonTextLocked: {
    color: 'rgba(200, 200, 200, 0.8)',
    fontSize: 18,
  },
});

export default GameScreen;