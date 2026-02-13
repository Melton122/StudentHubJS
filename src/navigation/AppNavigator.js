import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import AuthStack from './AuthStack';               // ✅ fixed – same folder
import MainTabNavigator from './MainTabNavigator'; // ✅ already correct

// Screens
import ResourceDetailsScreen from '../screens/resources/ResourceDetailsScreen';
import DownloadsScreen from '../screens/resources/DownloadsScreen';
import SubjectsScreen from '../screens/resources/SubjectsScreen';
import ResourcesScreen from '../screens/resources/ResourcesScreen';
import TutorDetailsScreen from '../screens/tutors/TutorDetailsScreen';
import TutorSessionsScreen from '../screens/tutors/TutorSessionsScreen';
import TutorReviewsScreen from '../screens/tutors/TutorReviewsScreen';
import RequestTutorScreen from '../screens/tutors/RequestTutorScreen';
import TutorBookingsScreen from '../screens/tutors/TutorBookingsScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import MySessionsScreen from '../screens/profile/MySessionsScreen';
import AdminPanel from '../screens/admin/AdminPanel';
import SettingsScreen from '../screens/profile/SettingsScreen';
import StudyTipsScreen from '../screens/study/StudyTipsScreen'; // create if missing

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />

            {/* Resource screens */}
            <Stack.Screen
              name="ResourceDetails"
              component={ResourceDetailsScreen}
              options={{ headerShown: true, title: 'Resource Details' }}
            />
            <Stack.Screen
              name="Downloads"
              component={DownloadsScreen}
              options={{ headerShown: true, title: 'My Downloads' }}
            />
            <Stack.Screen
              name="Subjects"
              component={SubjectsScreen}
              options={{ headerShown: true, title: 'Subjects' }}
            />
            <Stack.Screen
              name="Resources"
              component={ResourcesScreen}
              options={{ headerShown: true, title: 'Resources' }}
            />

            {/* Tutor screens */}
            <Stack.Screen
              name="TutorDetails"
              component={TutorDetailsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="TutorSessions"
              component={TutorSessionsScreen}
              options={{ headerShown: true, title: 'Available Sessions' }}
            />
            <Stack.Screen
              name="TutorReviews"
              component={TutorReviewsScreen}
              options={{ headerShown: true, title: 'Reviews' }}
            />
            <Stack.Screen
              name="RequestTutor"
              component={RequestTutorScreen}
              options={{ headerShown: true, title: 'Request Tutor' }}
            />
            <Stack.Screen
              name="TutorBookings"
              component={TutorBookingsScreen}
              options={{ headerShown: true, title: 'My Bookings' }}
            />

            {/* Profile screens */}
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ headerShown: true, title: 'Edit Profile' }}
            />
            <Stack.Screen
              name="MySessions"
              component={MySessionsScreen}
              options={{ headerShown: true, title: 'My Sessions' }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ headerShown: true, title: 'Settings' }}
            />

            {/* Admin */}
            <Stack.Screen
              name="AdminPanel"
              component={AdminPanel}
              options={{ headerShown: false }}
            />

            {/* Study Tips */}
            <Stack.Screen
              name="StudyTips"
              component={StudyTipsScreen}
              options={{ headerShown: true, title: 'Study Tips' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}