import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator, RefreshControl, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useStudy } from '../../context/StudyContext';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
  const { profile, user, signOut } = useAuth();
  const { studyStats } = useStudy();

  const [stats, setStats] = useState({
    bookedSessions: 0,
    downloadedResources: 0,
    tutorRequests: 0,
    totalStudyHours: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) fetchUserStats();
  }, [user]);

  const fetchUserStats = async () => {
    try {
      setLoadingStats(true);
      const [sessions, resources, requests] = await Promise.all([
        supabase.from('tutor_sessions').select('*', { count: 'exact', head: true }).eq('student_id', user.id),
        supabase.from('resources').select('*', { count: 'exact', head: true }),
        supabase.from('tutor_requests').select('*', { count: 'exact', head: true }).eq('student_email', user.email),
      ]);

      setStats({
        bookedSessions: sessions.count || 0,
        downloadedResources: resources.count || 0,
        tutorRequests: requests.count || 0,
        totalStudyHours: Math.floor((studyStats?.totalStudyTime || 0) / 3600),
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserStats();
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: signOut, style: "destructive" }
    ]);
  };

  const isAdmin = profile?.is_admin === true;

  // Admin quick actions
  const adminActions = [
    { icon: 'person-add', label: 'Add Tutor', color: '#6C5CE7', screen: 'AdminPanel', params: { tab: 'tutors' } },
    { icon: 'document-attach', label: 'Add Resource', color: '#00B894', screen: 'AdminPanel', params: { tab: 'resources' } },
    { icon: 'megaphone', label: 'Announce', color: '#FDCB6E', screen: 'AdminPanel', params: { tab: 'announcements' } },
    { icon: 'stats-chart', label: 'Reports', color: '#FD79A8', screen: 'AdminPanel', params: { tab: 'reports' } },
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />
      }
    >
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#1E2340', '#6C5CE7']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            {profile?.profile_image_url ? (
              <Image source={{ uri: profile.profile_image_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            )}
          </View>
          {isAdmin && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#FFF" />
            </View>
          )}
        </View>

        <Text style={styles.userName}>{profile?.full_name || 'Student'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <LinearGradient
            colors={['#6C5CE7', '#A29BFE']}
            style={styles.editButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="create-outline" size={18} color="#FFF" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#6C5CE720' }]}>
            <Ionicons name="calendar" size={20} color="#6C5CE7" />
          </View>
          <Text style={styles.statValue}>{loadingStats ? '—' : stats.bookedSessions}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#00B89420' }]}>
            <Ionicons name="time" size={20} color="#00B894" />
          </View>
          <Text style={styles.statValue}>{loadingStats ? '—' : stats.totalStudyHours}h</Text>
          <Text style={styles.statLabel}>Study Time</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#FDCB6E20' }]}>
            <Ionicons name="chatbubbles" size={20} color="#FDCB6E" />
          </View>
          <Text style={styles.statValue}>{loadingStats ? '—' : stats.tutorRequests}</Text>
          <Text style={styles.statLabel}>Requests</Text>
        </View>
      </View>

      {/* Admin Panel Quick Access – only visible to admins */}
      {isAdmin && (
        <View style={styles.adminSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Admin Dashboard</Text>
            <TouchableOpacity
              style={styles.seeAllButton}
              onPress={() => navigation.navigate('AdminPanel')}
            >
              <Text style={styles.seeAllText}>Open</Text>
              <Ionicons name="arrow-forward" size={16} color="#6C5CE7" />
            </TouchableOpacity>
          </View>
          <View style={styles.adminActionsGrid}>
            {adminActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.adminActionCard}
                onPress={() => navigation.navigate(action.screen, action.params)}
                activeOpacity={0.7}
              >
                <View style={[styles.adminActionIcon, { backgroundColor: action.color + '20' }]}>
                  <Ionicons name={action.icon} size={24} color={action.color} />
                </View>
                <Text style={styles.adminActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Academic Information */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Academic Information</Text>
          <TouchableOpacity
            style={styles.seeAllButton}
            onPress={() => navigation.navigate('Subjects')}
          >
            <Text style={styles.seeAllText}>View Subjects</Text>
            <Ionicons name="arrow-forward" size={16} color="#6C5CE7" />
          </TouchableOpacity>
        </View>
        <View style={styles.infoCard}>
          <InfoRow icon="school-outline" label="School" value={profile?.school_name || 'Not set'} />
          <InfoRow icon="location-outline" label="Province" value={profile?.province || 'Not set'} />
          <InfoRow icon="book-outline" label="Grade" value={profile?.grade_level || 'Grade 12'} />
          <InfoRow
            icon="list-outline"
            label="Subjects"
            value={profile?.selected_subjects?.slice(0, 3).join(', ') || 'No subjects selected'}
            valueNumberOfLines={2}
          />
        </View>
      </View>

      {/* Account & Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuGroup}>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('MySessions')}>
            <View style={[styles.menuIcon, { backgroundColor: '#6C5CE720' }]}>
              <Ionicons name="calendar-outline" size={20} color="#6C5CE7" />
            </View>
            <Text style={styles.menuText}>My Booked Sessions</Text>
            <Ionicons name="chevron-forward" size={20} color="#636E72" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Downloads')}>
            <View style={[styles.menuIcon, { backgroundColor: '#00B89420' }]}>
              <Ionicons name="download-outline" size={20} color="#00B894" />
            </View>
            <Text style={styles.menuText}>My Downloads</Text>
            <Ionicons name="chevron-forward" size={20} color="#636E72" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Settings')}>
            <View style={[styles.menuIcon, { backgroundColor: '#636E7220' }]}>
              <Ionicons name="settings-outline" size={20} color="#636E72" />
            </View>
            <Text style={styles.menuText}>Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#636E72" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LinearGradient
          colors={['#FF767520', '#FF767510']}
          style={styles.logoutGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="log-out-outline" size={20} color="#FF7675" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const InfoRow = ({ icon, label, value, valueNumberOfLines = 1 }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIcon}>
      <Ionicons name={icon} size={18} color="#6C5CE7" />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={valueNumberOfLines}>
        {value}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFF',
  },
  adminBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#00B894',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1E2340',
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#A29BFE',
    marginBottom: 20,
  },
  editButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  editButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  editButtonText: {
    color: '#FFF',
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 15,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: -20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E2340',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D3561',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#A29BFE',
    textAlign: 'center',
  },

  // Section common
  section: {
    paddingHorizontal: 20,
    marginTop: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    color: '#6C5CE7',
    fontWeight: '600',
  },

  // Admin section
  adminSection: {
    paddingHorizontal: 20,
    marginTop: 25,
  },
  adminActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  adminActionCard: {
    width: (width - 64) / 4,
    backgroundColor: '#1E2340',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D3561',
  },
  adminActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  adminActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
  },

  // Info Card
  infoCard: {
    backgroundColor: '#1E2340',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2D3561',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#6C5CE720',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#A29BFE',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: '#FFF',
    fontWeight: '600',
  },

  // Menu Group
  menuGroup: {
    backgroundColor: '#1E2340',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2D3561',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3561',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },

  // Logout
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 25,
    borderRadius: 16,
    overflow: 'hidden',
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#FF767530',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF7675',
    marginLeft: 10,
  },
});