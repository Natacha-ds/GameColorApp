import React from 'react';
import { StatusBar } from 'expo-status-bar';
import GameScreen from './components/GameScreen';

export default function App() {
  return (
    <>
      <GameScreen />
      <StatusBar style="light" />
    </>
  );
}
