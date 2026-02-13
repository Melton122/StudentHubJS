import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import StudyStack from './StudyStack';

// Tab screens
import HomeScreen from '../screens/home/HomeScreen';
import ResourcesScreen from '../screens/resources/ResourcesScreen';
import TutorsScreen from '../screens/tutors/TutorsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Study') iconName = 'book';
          else if (route.name === 'Resources') iconName = 'folder';
          else if (route.name === 'Tutors') iconName = 'people';
          else if (route.name === 'Profile') iconName = 'person';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6C5CE7',
        tabBarInactiveTintColor: '#636E72',
        tabBarStyle: { backgroundColor: '#1E2340', borderTopColor: '#2D3561', paddingBottom: 5 },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Study" component={StudyStack} />
      <Tab.Screen name="Resources" component={ResourcesScreen} />
      <Tab.Screen name="Tutors" component={TutorsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}