import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export const LoadingScreen = ({ message = 'Loading your study dashboard...' }) => (
  <View style={styles.container}>
    <LinearGradient colors={['#6C5CE7', '#A29BFE']} style={styles.gradient}>
      <Ionicons name="book" size={60} color="#FFF" />
      <Text style={styles.message}>{message}</Text>
    </LinearGradient>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  gradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    marginTop: 20,
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
});