import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { StudyProvider } from './src/context/StudyContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StudyProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </StudyProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}