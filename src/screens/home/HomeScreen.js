import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Alert, Image, Animated, RefreshControl,
  FlatList, Modal, TextInput, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';
import { useStudy } from '../../context/StudyContext';
import { supabase } from '../../services/supabaseConfig';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { profile, user } = useAuth();
  const { studyStats, getStudyProgress, refreshStats } = useStudy();

  // ========== STATE ==========
  const [dailyTip, setDailyTip] = useState(null);
  const [nextReminder, setNextReminder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // ✅ FIXED EXAM DATE: 30 October 2026 – NO EDITING
  const [examCountdown, setExamCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    examName: 'Matric Finals',
    examDate: new Date(2026, 9, 30), // 30 October 2026 (month is 0-indexed)
  });

  const [newResources, setNewResources] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [activeStudents, setActiveStudents] = useState(0);
  const [featuredTutors, setFeaturedTutors] = useState([]);
  const [loadingTutors, setLoadingTutors] = useState(false);

  const MASTER_EMAIL = 'meltonhlungwani970@gmail.com';
  const intervalRef = useRef(null);

  // ========== LIFECYCLE ==========
  useEffect(() => {
    loadInitialData();
    startPulseAnimation();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ✅ Start countdown immediately with fixed date
  useEffect(() => {
    if (examCountdown.examDate) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(updateExamCountdown, 1000);
      return () => clearInterval(intervalRef.current);
    }
  }, []); // No dependency – runs once

  // ========== ANIMATION ==========
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  };

  // ========== FIXED COUNTDOWN – NO EDITING ==========
  const updateExamCountdown = () => {
    setExamCountdown(prev => {
      const now = new Date();
      const examDate = new Date(prev.examDate);
      const diff = examDate - now;

      if (diff <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return { ...prev, days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        ...prev,
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % 86400000) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % 3600000) / (1000 * 60)),
        seconds: Math.floor((diff % 60000) / 1000),
      };
    });
  };

  // ========== DATA FETCHING ==========
  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        refreshStats?.(),
        fetchDailyTip(),
        fetchNextReminder(),
        fetchNewResources(),
        fetchAnnouncements(),
        fetchActiveStudents(),
        fetchFeaturedTutors(),
      ]);
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refreshStats?.(),
      fetchDailyTip(),
      fetchNextReminder(),
      fetchNewResources(),
      fetchAnnouncements(),
      fetchActiveStudents(),
      fetchFeaturedTutors(),
    ]);
    setRefreshing(false);
  };

  // ----- FETCH FEATURED TUTORS -----
  const fetchFeaturedTutors = async () => {
    try {
      setLoadingTutors(true);
      const { data, error } = await supabase
        .from('tutors')
        .select('*')
        .eq('is_verified', true)
        .order('rating', { ascending: false })
        .limit(3);
      if (!error && data) setFeaturedTutors(data);
    } catch (error) {
      console.error('Error fetching tutors:', error);
    } finally {
      setLoadingTutors(false);
    }
  };

  // ----- FETCH ACTIVE STUDENTS (24h) -----
  const fetchActiveStudents = async () => {
    try {
      const { data, error } = await supabase.rpc('get_active_students_count');
      if (!error) {
        setActiveStudents(data || 0);
        return;
      }
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await supabase
        .from('study_sessions')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo);
      if (!countError) setActiveStudents(count || 0);
      else setActiveStudents(150);
    } catch (error) {
      console.error('Error fetching active students:', error);
      setActiveStudents(150);
    }
  };

  // ----- FETCH NEW RESOURCES -----
  const fetchNewResources = async () => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(4);
      if (!error) setNewResources(data || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

  // ----- FETCH ANNOUNCEMENTS -----
  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3);
      if (!error) setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  // ----- FETCH DAILY TIP -----
  const fetchDailyTip = async () => {
    const tips = [
      "Study in 25-minute intervals with 5-minute breaks (Pomodoro Technique).",
      "Active recall: Test yourself instead of just re-reading notes.",
      "Spaced repetition: Review material at increasing intervals.",
      "Teach someone else: The Feynman Technique improves understanding.",
      "Stay hydrated! Dehydration can reduce focus by up to 30%.",
      "Use mind maps to visualize complex topics and connections.",
      "Review your weakest subject first when your mind is freshest.",
      "Create flashcards for key formulas, dates, and definitions.",
      "Practice past papers under exam conditions for time management.",
      "Get enough sleep - it's crucial for memory consolidation.",
    ];
    setDailyTip(tips[new Date().getDate() % tips.length]);
  };

  // ----- FETCH NEXT REMINDER -----
  const fetchNextReminder = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('study_reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gte('time', new Date().toISOString())
        .order('time')
        .limit(1);
      if (data?.length) {
        setNextReminder({
          time: new Date(data[0].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          title: data[0].title,
        });
      } else {
        setNextReminder(null);
      }
    } catch (error) {
      console.error('Error fetching next reminder:', error);
      setNextReminder(null);
    }
  };

  // ========== ACTIONS ==========
  const handleSecretAdminAccess = () => {
    if (user?.email === MASTER_EMAIL && profile?.is_admin) {
      navigation.navigate('AdminPanel');
    } else {
      Alert.alert(
        "🎯 Matric Focus",
        "Keep pushing! Consistent study is the bridge between goals and accomplishment.\n\nLong press (3s) on your profile picture for admin access."
      );
    }
  };

  const quickActions = [
    { icon: 'timer-outline', label: 'Timer', color: '#6C5CE7', screen: 'Pomodoro', nested: true },
    { icon: 'flash-outline', label: 'Flashcards', color: '#00B894', screen: 'FlashCards', nested: true },
    { icon: 'people-outline', label: 'Tutors', color: '#FD79A8', screen: 'Tutors', nested: false },
    { icon: 'notifications-outline', label: 'Reminders', color: '#FDCB6E', screen: 'StudyReminder', nested: true },
    { icon: 'book-outline', label: 'Subjects', color: '#74B9FF', screen: 'Subjects', nested: false },
    { icon: 'document-outline', label: 'Resources', color: '#AA00FF', screen: 'Resources', nested: false },
    { icon: 'calendar-outline', label: 'Plan', color: '#FF7675', screen: 'StudyPlan', nested: true },
    { icon: 'analytics-outline', label: 'Analytics', color: '#00CEC9', screen: 'StudyAnalytics', nested: true },
  ];

  const handleQuickActionPress = (action) => {
    if (action.nested) navigation.navigate('Study', { screen: action.screen });
    else navigation.navigate(action.screen);
  };

  // ========== RENDER HELPERS ==========
  const renderStars = (rating) => {
    const stars = [];
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    for (let i = 0; i < 5; i++) {
      if (i < full) stars.push(<Ionicons key={i} name="star" size={12} color="#FDCB6E" />);
      else if (i === full && half) stars.push(<Ionicons key={i} name="star-half" size={12} color="#FDCB6E" />);
      else stars.push(<Ionicons key={i} name="star-outline" size={12} color="#FDCB6E" />);
    }
    return stars;
  };

  const renderFeaturedTutor = ({ item }) => (
    <TouchableOpacity style={styles.tutorCard} onPress={() => navigation.navigate('TutorDetails', { tutor: item })} activeOpacity={0.8}>
      <LinearGradient colors={['#1E2340', '#2D3561']} style={styles.tutorGradient}>
        <View style={styles.tutorImageContainer}>
          {item.profile_image_url ? (
            <Image source={{ uri: item.profile_image_url }} style={styles.tutorImage} />
          ) : (
            <View style={styles.tutorInitials}>
              <Text style={styles.tutorInitialsText}>{item.name?.charAt(0)?.toUpperCase() || 'T'}</Text>
            </View>
          )}
          {item.is_verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#00B894" />
            </View>
          )}
        </View>
        <View style={styles.tutorInfo}>
          <Text style={styles.tutorName} numberOfLines={1}>{item.name || 'Tutor'}</Text>
          <View style={styles.tutorRating}>
            {renderStars(item.rating || 0)}
            <Text style={styles.ratingText}>{item.rating?.toFixed(1) || '4.5'}</Text>
          </View>
          <View style={styles.tutorSubjects}>
            <Ionicons name="book" size={10} color="#A29BFE" />
            <Text style={styles.subjectText} numberOfLines={1}>{item.subjects?.[0] || 'Mathematics'}</Text>
          </View>
          <View style={styles.tutorPrice}>
            <Text style={styles.priceText}>R{item.hourly_rate || 200}/hr</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderStatCard = (icon, value, label, color) => (
    <View key={label} style={[styles.statCard, { borderColor: color + '30' }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={['#6C5CE7', '#A29BFE']} style={styles.loadingGradient}>
          <Ionicons name="book" size={60} color="#FFF" />
          <Text style={styles.loadingText}>Loading your study dashboard...</Text>
        </LinearGradient>
      </View>
    );
  }

  const progress = getStudyProgress?.() || 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" colors={['#6C5CE7']} />
        }
      >
        {/* ========== HEADER ========== */}
        <TouchableOpacity activeOpacity={0.9} onLongPress={handleSecretAdminAccess} delayLongPress={3000}>
          <LinearGradient colors={['#1E2340', '#6C5CE7']} style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerTextContainer}>
                <Text style={styles.greeting}>
                  Hello, {profile?.full_name?.split(' ')[0] || 'Student'}! 👋
                </Text>
                <Text style={styles.name}>{profile?.full_name || 'Matric Student'}</Text>
                <View style={styles.schoolInfo}>
                  <Ionicons name="school" size={14} color="#A29BFE" />
                  <Text style={styles.subtitle}>{profile?.school_name || 'Grade 12 Student'}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
                <LinearGradient colors={['#FFF', '#E0E0FF']} style={styles.avatar}>
                  {profile?.profile_image_url ? (
                    <Image source={{ uri: profile.profile_image_url }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>{profile?.full_name?.charAt(0)?.toUpperCase() || 'S'}</Text>
                  )}
                </LinearGradient>
                {profile?.is_admin && (
                  <View style={styles.adminBadge}>
                    <Ionicons name="shield-checkmark" size={12} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Community Stats */}
            <View style={styles.communityStats}>
              <View style={styles.communityItem}>
                <View style={styles.communityIcon}>
                  <Ionicons name="people" size={14} color="#A29BFE" />
                </View>
                <View>
                  <Text style={styles.communityNumber}>{activeStudents}+</Text>
                  <Text style={styles.communityLabel}>Active Students</Text>
                </View>
              </View>
              <View style={styles.communityDivider} />
              <View style={styles.communityItem}>
                <View style={styles.communityIcon}>
                  <Ionicons name="flame" size={14} color="#A29BFE" />
                </View>
                <View>
                  <Text style={styles.communityNumber}>{studyStats.streakDays}</Text>
                  <Text style={styles.communityLabel}>Day Streak</Text>
                </View>
              </View>
              <View style={styles.communityDivider} />
              <View style={styles.communityItem}>
                <View style={styles.communityIcon}>
                  <Ionicons name="time" size={14} color="#A29BFE" />
                </View>
                <View>
                  <Text style={styles.communityNumber}>{Math.floor(studyStats.totalStudyTime / 3600)}</Text>
                  <Text style={styles.communityLabel}>Total Hours</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ========== EXAM COUNTDOWN – FIXED 30 OCT 2026 ========== */}
        <Animated.View style={[styles.countdownCard, { transform: [{ scale: pulseAnim }] }]}>
          <LinearGradient colors={['#FF7675', '#FF5252']} style={styles.countdownGradient}>
            <View style={styles.countdownHeader}>
              <View style={styles.countdownIcon}>
                <Ionicons name="time" size={28} color="#FFF" />
              </View>
              <View style={styles.countdownTitle}>
                <Text style={styles.countdownLabel}>COUNTDOWN TO</Text>
                <Text style={styles.countdownExam}>Matric Finals</Text>
                <Text style={styles.countdownSubtext}>Start of written exams</Text>
              </View>
            </View>

            <View style={styles.countdownTimer}>
              <View style={styles.timeUnit}>
                <View style={styles.timeBox}>
                  <Text style={styles.timeNumber}>{String(examCountdown.days).padStart(2, '0')}</Text>
                </View>
                <Text style={styles.timeLabel}>DAYS</Text>
              </View>
              <Text style={styles.timeSeparator}>:</Text>
              <View style={styles.timeUnit}>
                <View style={styles.timeBox}>
                  <Text style={styles.timeNumber}>{String(examCountdown.hours).padStart(2, '0')}</Text>
                </View>
                <Text style={styles.timeLabel}>HRS</Text>
              </View>
              <Text style={styles.timeSeparator}>:</Text>
              <View style={styles.timeUnit}>
                <View style={styles.timeBox}>
                  <Text style={styles.timeNumber}>{String(examCountdown.minutes).padStart(2, '0')}</Text>
                </View>
                <Text style={styles.timeLabel}>MINS</Text>
              </View>
              <Text style={styles.timeSeparator}>:</Text>
              <View style={styles.timeUnit}>
                <View style={styles.timeBox}>
                  <Text style={styles.timeNumber}>{String(examCountdown.seconds).padStart(2, '0')}</Text>
                </View>
                <Text style={styles.timeLabel}>SECS</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.studyPlanButton}
              onPress={() => navigation.navigate('Study', { screen: 'StudyPlan' })}
            >
              <Ionicons name="calendar" size={18} color="#FFF" />
              <Text style={styles.studyPlanText}>Create Study Plan</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* ========== TODAY'S PROGRESS ========== */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View style={styles.progressTitleContainer}>
              <Ionicons name="trending-up" size={24} color="#00B894" />
              <Text style={styles.progressTitle}>Today's Progress</Text>
            </View>
            <TouchableOpacity
              style={styles.goalInfo}
              onPress={() => navigation.navigate('Study', { screen: 'StudyAnalytics' })}
            >
              <Ionicons name="analytics" size={16} color="#00B894" />
              <Text style={styles.goalText}>Analytics</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={['#00B894', '#00E5B4']}
                style={[styles.progressFill, { width: `${progress * 100}%` }]}
              />
            </View>
            <View style={styles.progressInfo}>
              <Text style={styles.progressText}>
                {Math.floor(studyStats.todayStudyTime / 3600)}h{' '}
                {Math.floor((studyStats.todayStudyTime % 3600) / 60)}m
              </Text>
              <Text style={styles.progressGoal}>
                / {studyStats.dailyGoal}h goal ({Math.round(progress * 100)}%)
              </Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            {renderStatCard('time', Math.floor(studyStats.totalStudyTime / 3600), 'Total Hours', '#00B894')}
            {renderStatCard('flash', studyStats.flashcardCount, 'Flashcards', '#6C5CE7')}
            {renderStatCard('flame', studyStats.streakDays, 'Day Streak', '#FF7675')}
            {renderStatCard('checkmark-circle', studyStats.completedSessions, 'Sessions', '#FDCB6E')}
          </View>
        </View>

        {/* ========== QUICK ACTIONS ========== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <Text style={styles.sectionSubtitle}>Access tools instantly</Text>
          </View>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionCard}
                onPress={() => handleQuickActionPress(action)}
                activeOpacity={0.7}
              >
                <LinearGradient colors={[`${action.color}20`, `${action.color}10`]} style={styles.actionIcon}>
                  <Ionicons name={action.icon} size={26} color={action.color} />
                </LinearGradient>
                <Text style={styles.actionLabel} numberOfLines={2}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ========== FEATURED TUTORS ========== */}
        {featuredTutors.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Featured Tutors</Text>
                <Text style={styles.sectionSubtitle}>Get help from experts</Text>
              </View>
              <TouchableOpacity style={styles.seeAllButton} onPress={() => navigation.navigate('Tutors')}>
                <Text style={styles.seeAll}>See All</Text>
                <Ionicons name="arrow-forward" size={16} color="#6C5CE7" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={featuredTutors}
              renderItem={renderFeaturedTutor}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tutorsList}
            />
          </View>
        )}

        {/* ========== STUDY RESOURCES ========== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Study Resources</Text>
              <Text style={styles.sectionSubtitle}>Access materials by subject</Text>
            </View>
            <TouchableOpacity style={styles.seeAllButton} onPress={() => navigation.navigate('Subjects')}>
              <Text style={styles.seeAll}>All Subjects</Text>
              <Ionicons name="arrow-forward" size={16} color="#6C5CE7" />
            </TouchableOpacity>
          </View>

          <View style={styles.resourceCards}>
            <TouchableOpacity style={styles.mainResourceCard} onPress={() => navigation.navigate('Subjects')}>
              <LinearGradient colors={['#6C5CE7', '#A29BFE']} style={styles.mainResourceGradient}>
                <View style={styles.resourceIconContainer}>
                  <Ionicons name="book" size={32} color="#FFF" />
                </View>
                <Text style={styles.mainResourceTitle}>My Subjects</Text>
                <Text style={styles.mainResourceCount}>
                  {profile?.selected_subjects?.length || 0} subjects
                </Text>
                <View style={styles.resourceArrow}>
                  <Ionicons name="arrow-forward" size={20} color="#FFF" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.resourceGrid}>
              <TouchableOpacity style={styles.smallResourceCard} onPress={() => navigation.navigate('Resources')}>
                <View style={[styles.smallResourceIcon, { backgroundColor: '#00B89420' }]}>
                  <Ionicons name="document-text" size={20} color="#00B894" />
                </View>
                <Text style={styles.smallResourceLabel}>All Resources</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallResourceCard} onPress={() => navigation.navigate('Downloads')}>
                <View style={[styles.smallResourceIcon, { backgroundColor: '#FD79A820' }]}>
                  <Ionicons name="download" size={20} color="#FD79A8" />
                </View>
                <Text style={styles.smallResourceLabel}>Downloads</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallResourceCard}
                onPress={() => navigation.navigate('Study', { screen: 'StudyPlan' })}
              >
                <View style={[styles.smallResourceIcon, { backgroundColor: '#FDCB6E20' }]}>
                  <Ionicons name="calendar" size={20} color="#FDCB6E" />
                </View>
                <Text style={styles.smallResourceLabel}>Study Plan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallResourceCard}
                onPress={() => navigation.navigate('StudyTips')}
              >
                <View style={[styles.smallResourceIcon, { backgroundColor: '#74B9FF20' }]}>
                  <Ionicons name="bulb" size={20} color="#74B9FF" />
                </View>
                <Text style={styles.smallResourceLabel}>Study Tips</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ========== ANNOUNCEMENTS ========== */}
        {announcements.length > 0 && (
          <View style={styles.announcementsCard}>
            <LinearGradient colors={['#FDCB6E20', '#FDCB6E10']} style={styles.announcementsGradient}>
              <View style={styles.announcementsHeader}>
                <Ionicons name="megaphone" size={24} color="#FDCB6E" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.announcementsTitle}>Announcements</Text>
                  <Text style={styles.announcementsSubtitle}>Important updates</Text>
                </View>
              </View>
              {announcements.map((a, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.announcementItem}
                  onPress={() => Alert.alert(a.title, a.message)}
                >
                  <View style={styles.announcementContent}>
                    <View style={styles.announcementDot} />
                    <View style={styles.announcementTextContainer}>
                      <Text style={styles.announcementText} numberOfLines={1}>{a.title}</Text>
                      <Text style={styles.announcementDate}>
                        {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#FDCB6E" />
                </TouchableOpacity>
              ))}
            </LinearGradient>
          </View>
        )}

        {/* ========== DAILY TIP ========== */}
        {dailyTip && (
          <TouchableOpacity
            style={styles.tipCard}
            onPress={() => navigation.navigate('StudyTips')}
            activeOpacity={0.9}
          >
            <LinearGradient colors={['#6C5CE720', '#6C5CE710']} style={styles.tipGradient}>
              <View style={styles.tipHeader}>
                <Ionicons name="bulb" size={28} color="#6C5CE7" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.tipTitle}>Study Tip of the Day</Text>
                  <Text style={styles.tipSubtitle}>Boost your learning</Text>
                </View>
              </View>
              <Text style={styles.tipText} numberOfLines={2}>{dailyTip}</Text>
              <View style={styles.tipAction}>
                <Text style={styles.tipActionText}>View all tips</Text>
                <Ionicons name="arrow-forward" size={16} color="#6C5CE7" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ========== TUTOR REQUEST ========== */}
        <TouchableOpacity style={styles.quickRequestCard} onPress={() => navigation.navigate('RequestTutor')}>
          <LinearGradient colors={['#00B89420', '#00B89410']} style={styles.quickRequestGradient}>
            <View style={styles.quickRequestHeader}>
              <Ionicons name="school" size={28} color="#00B894" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.quickRequestTitle}>Need 1-on-1 Help?</Text>
                <Text style={styles.quickRequestText}>Connect with certified tutors</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.requestTutorButton} onPress={() => navigation.navigate('RequestTutor')}>
              <Ionicons name="chatbubble-ellipses" size={18} color="#FFF" />
              <Text style={styles.requestTutorText}>Request Tutor</Text>
            </TouchableOpacity>
          </LinearGradient>
        </TouchableOpacity>

        {/* ========== NEXT REMINDER ========== */}
        {nextReminder && (
          <TouchableOpacity
            style={styles.reminderCard}
            onPress={() => navigation.navigate('Study', { screen: 'StudyReminder' })}
            activeOpacity={0.9}
          >
            <LinearGradient colors={['#FD79A820', '#FD79A810']} style={styles.reminderGradient}>
              <View style={styles.reminderHeader}>
                <Ionicons name="notifications" size={28} color="#FD79A8" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.reminderTitle}>Next Study Reminder</Text>
                  <Text style={styles.reminderTime}>{nextReminder.time} • {nextReminder.title}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FD79A8" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ========== MOTIVATION QUOTE ========== */}
        <View style={styles.motivationCard}>
          <LinearGradient colors={['#1E2340', '#2D3561']} style={styles.motivationGradient}>
            <Ionicons name="chatbubble-ellipses" size={28} color="#74B9FF" />
            <Text style={styles.motivationText}>
              "Success is the sum of small efforts, repeated day in and day out."
            </Text>
            <Text style={styles.motivationAuthor}>– Robert Collier</Text>
          </LinearGradient>
        </View>

        {/* ========== FOOTER ========== */}
        <View style={styles.footer}>
          <LinearGradient colors={['#1E2340', '#0A0E27']} style={styles.footerGradient}>
            <Ionicons name="school" size={24} color="#6C5CE7" />
            <Text style={styles.footerText}>StuddyHub • Your Matric Success Partner</Text>
            <Text style={styles.footerSubtext}>Keep learning, keep growing! 📚</Text>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
}

// ----- PROFESSIONAL, RESPONSIVE STYLES (unchanged) -----
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E27' },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0E27' },
  loadingGradient: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 20, fontSize: 16, color: '#FFF', fontWeight: '600' },

  // ----- Header -----
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 10,
    elevation: 5,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTextContainer: { flex: 1, marginRight: 12 },
  greeting: { fontSize: 14, color: '#A29BFE', marginBottom: 4, fontWeight: '500' },
  name: { fontSize: 24, fontWeight: '800', color: '#FFF', marginBottom: 6 },
  schoolInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  subtitle: { fontSize: 14, color: '#A29BFE' },
  profileButton: { position: 'relative' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 26 },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#6C5CE7' },
  adminBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#00B894',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1E2340',
  },

  // ----- Community Stats -----
  communityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 14,
    marginTop: 10,
  },
  communityItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  communityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  communityNumber: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  communityLabel: { fontSize: 10, color: '#A29BFE', marginTop: 2 },
  communityDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 8 },

  // ----- Countdown -----
  countdownCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#FF7675',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  countdownGradient: { padding: 20, borderRadius: 25 },
  countdownHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  countdownIcon: { marginRight: 12 },
  countdownTitle: { flex: 1 },
  countdownLabel: { fontSize: 11, fontWeight: '700', color: '#FFF', letterSpacing: 1.5, opacity: 0.9 },
  countdownExam: { fontSize: 18, fontWeight: '800', color: '#FFF', marginTop: 2 },
  countdownSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  countdownTimer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  timeUnit: { alignItems: 'center', flex: 1 },
  timeBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 6,
  },
  timeNumber: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  timeLabel: { fontSize: 10, color: '#FFF', fontWeight: '700', letterSpacing: 1, opacity: 0.9 },
  timeSeparator: { fontSize: 20, fontWeight: '800', color: '#FFF', opacity: 0.7, marginHorizontal: 2 },
  studyPlanButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  studyPlanText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  // ----- Progress Card -----
  progressCard: {
    backgroundColor: '#1E2340',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#2D3561',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  progressTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00B89420',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00B89440',
  },
  goalText: { fontSize: 12, fontWeight: '600', color: '#00B894' },
  progressBarContainer: { marginBottom: 20 },
  progressBar: { height: 10, backgroundColor: '#2D3561', borderRadius: 5, marginBottom: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  progressGoal: { fontSize: 13, color: '#A29BFE' },

  // ----- Stats Grid -----
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#0F1333',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D3561',
  },
  statIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#FFF', marginBottom: 2 },
  statLabel: { fontSize: 10, color: '#A29BFE', textAlign: 'center' },

  // ----- Section -----
  section: { paddingHorizontal: 20, marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', marginBottom: 2 },
  sectionSubtitle: { fontSize: 12, color: '#A29BFE' },
  seeAllButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 2 },
  seeAll: { fontSize: 13, color: '#6C5CE7', fontWeight: '600' },

  // ----- Quick Actions – Responsive Grid -----
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 64) / 4,
    backgroundColor: '#1E2340',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D3561',
  },
  actionIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 11, fontWeight: '600', color: '#FFF', textAlign: 'center' },

  // ----- Tutors -----
  tutorsList: { paddingBottom: 8 },
  tutorCard: { width: 150, marginRight: 12, borderRadius: 20, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  tutorGradient: { padding: 16, borderRadius: 20, alignItems: 'center' },
  tutorImageContainer: { position: 'relative', marginBottom: 10 },
  tutorImage: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: '#6C5CE7' },
  tutorInitials: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF' },
  tutorInitialsText: { fontSize: 26, fontWeight: '800', color: '#FFF' },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#FFF', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#1E2340' },
  tutorName: { fontSize: 15, fontWeight: '800', color: '#FFF', marginBottom: 6, textAlign: 'center' },
  tutorRating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  ratingText: { fontSize: 11, color: '#FDCB6E', fontWeight: '600', marginLeft: 4 },
  tutorSubjects: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  subjectText: { fontSize: 11, color: '#A29BFE', flex: 1 },
  tutorPrice: { backgroundColor: '#00B89420', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#00B89440' },
  priceText: { fontSize: 12, fontWeight: '700', color: '#00B894' },

  // ----- Resources – Responsive Layout -----
  resourceCards: { flexDirection: 'row', gap: 12 },
  mainResourceCard: {
    flex: 2.2,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  mainResourceGradient: { padding: 16, height: 160, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  resourceIconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  mainResourceTitle: { fontSize: 16, fontWeight: '800', color: '#FFF', marginBottom: 4, textAlign: 'center' },
  mainResourceCount: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 10 },
  resourceArrow: { position: 'absolute', bottom: 16, right: 16 },
  resourceGrid: { flex: 3, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallResourceCard: {
    width: (width - 92) / 2,
    backgroundColor: '#1E2340',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2D3561',
  },
  smallResourceIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  smallResourceLabel: { fontSize: 11, fontWeight: '600', color: '#FFF', textAlign: 'center' },

  // ----- Announcements -----
  announcementsCard: { marginHorizontal: 20, marginBottom: 20, borderRadius: 20, overflow: 'hidden' },
  announcementsGradient: { padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#FDCB6E30' },
  announcementsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  announcementsTitle: { fontSize: 18, fontWeight: '700', color: '#FDCB6E', marginBottom: 2 },
  announcementsSubtitle: { fontSize: 11, color: '#FDCB6E', opacity: 0.8 },
  announcementItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#FDCB6E10' },
  announcementContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  announcementDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FDCB6E', marginRight: 12 },
  announcementTextContainer: { flex: 1 },
  announcementText: { fontSize: 14, color: '#FFF', fontWeight: '600' },
  announcementDate: { fontSize: 11, color: '#FDCB6E', marginTop: 2 },

  // ----- Daily Tip -----
  tipCard: { marginHorizontal: 20, marginBottom: 20, borderRadius: 20, overflow: 'hidden' },
  tipGradient: { padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#6C5CE730' },
  tipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tipTitle: { fontSize: 16, fontWeight: '700', color: '#6C5CE7', marginBottom: 2 },
  tipSubtitle: { fontSize: 11, color: '#6C5CE7', opacity: 0.8 },
  tipText: { fontSize: 14, color: '#FFF', lineHeight: 20, marginBottom: 14 },
  tipAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#6C5CE710' },
  tipActionText: { fontSize: 13, color: '#6C5CE7', fontWeight: '600' },

  // ----- Tutor Request -----
  quickRequestCard: { marginHorizontal: 20, marginBottom: 20, borderRadius: 20, overflow: 'hidden' },
  quickRequestGradient: { padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#00B89430' },
  quickRequestHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  quickRequestTitle: { fontSize: 16, fontWeight: '700', color: '#00B894', marginBottom: 2 },
  quickRequestText: { fontSize: 13, color: '#FFF', opacity: 0.9 },
  requestTutorButton: { backgroundColor: '#00B894', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 14 },
  requestTutorText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  // ----- Reminder -----
  reminderCard: { marginHorizontal: 20, marginBottom: 20, borderRadius: 20, overflow: 'hidden' },
  reminderGradient: { padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#FD79A830', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reminderHeader: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  reminderTitle: { fontSize: 15, fontWeight: '700', color: '#FD79A8', marginBottom: 2 },
  reminderTime: { fontSize: 13, color: '#FFF', opacity: 0.9 },

  // ----- Motivation -----
  motivationCard: { marginHorizontal: 20, marginBottom: 20, borderRadius: 20, overflow: 'hidden' },
  motivationGradient: { padding: 20, borderRadius: 20, alignItems: 'center' },
  motivationText: { fontSize: 14, fontStyle: 'italic', color: '#FFF', textAlign: 'center', marginTop: 12, marginBottom: 8, lineHeight: 20 },
  motivationAuthor: { fontSize: 12, color: '#74B9FF', fontWeight: '600' },

  // ----- Footer -----
  footer: { marginHorizontal: 20, marginBottom: 30, borderRadius: 20, overflow: 'hidden' },
  footerGradient: { padding: 24, borderRadius: 20, alignItems: 'center' },
  footerText: { fontSize: 14, fontWeight: '700', color: '#FFF', marginTop: 12, marginBottom: 6, textAlign: 'center' },
  footerSubtext: { fontSize: 11, color: '#A29BFE', textAlign: 'center' },
});