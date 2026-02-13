import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SubjectsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Subjects Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0E27' },
  text: { color: '#FFF', fontSize: 18 },
});