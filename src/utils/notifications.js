import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Request notification permissions
 * @returns {Promise<boolean>} True if granted
 */
export const requestNotificationPermissions = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

/**
 * Schedule a study reminder notification
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} trigger - Expo Notifications trigger object
 * @returns {Promise<string>} Notification identifier
 */
export const scheduleStudyReminder = async (title, body, trigger) => {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger,
  });
};

/**
 * Cancel a specific notification
 * @param {string} notificationId - Notification identifier
 */
export const cancelReminder = async (notificationId) => {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllReminders = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

/**
 * Configure notification handler for foreground
 */
export const configureNotifications = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
};

/**
 * Get Expo push token (for remote notifications)
 * @returns {Promise<string|null>} Push token or null
 */
export const getPushToken = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C5CE7',
    });
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID, // Set this in .env
  });
  return token.data;
};