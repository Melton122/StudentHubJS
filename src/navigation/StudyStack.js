import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PomodoroTimerScreen from '../screens/study/PomodoroTimerScreen';
import FlashCardsScreen from '../screens/study/FlashCardsScreen';
import StudyPlanScreen from '../screens/study/StudyPlanScreen';
import StudyAnalyticsScreen from '../screens/study/StudyAnalyticsScreen';
import StudyReminderScreen from '../screens/study/StudyReminderScreen';
import GoalSettingScreen from '../screens/study/GoalSettingScreen';
import StudySessionScreen from '../screens/study/StudySessionScreen';

const Stack = createNativeStackNavigator();

export default function StudyStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Pomodoro" component={PomodoroTimerScreen} options={{ title: 'Study Timer' }} />
      <Stack.Screen name="FlashCards" component={FlashCardsScreen} options={{ title: 'Flash Cards' }} />
      <Stack.Screen name="StudyPlan" component={StudyPlanScreen} options={{ title: 'Study Plan' }} />
      <Stack.Screen name="StudyAnalytics" component={StudyAnalyticsScreen} options={{ title: 'Analytics' }} />
      <Stack.Screen name="StudyReminder" component={StudyReminderScreen} options={{ title: 'Reminders' }} />
      <Stack.Screen name="GoalSetting" component={GoalSettingScreen} options={{ title: 'Goals' }} />
      <Stack.Screen name="StudySession" component={StudySessionScreen} options={{ title: 'Session' }} />
    </Stack.Navigator>
  );
}