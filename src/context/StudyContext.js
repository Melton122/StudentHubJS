import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../services/supabaseConfig';
import { useAuth } from './AuthContext';

const StudyContext = createContext(null);

export const StudyProvider = ({ children }) => {
  const { user } = useAuth();
  const [studyStats, setStudyStats] = useState({
    dailyGoal: 2,
    todayStudyTime: 0,
    totalStudyTime: 0,
    streakDays: 0,
    focusScore: 0,
    completedSessions: 0,
    flashcardCount: 0,
  });

  useEffect(() => {
    if (user) refreshStats();
    else resetStats();
  }, [user]);

  const resetStats = () => {
    setStudyStats({
      dailyGoal: 2,
      todayStudyTime: 0,
      totalStudyTime: 0,
      streakDays: 0,
      focusScore: 0,
      completedSessions: 0,
      flashcardCount: 0,
    });
  };

  const refreshStats = useCallback(async () => {
    if (!user) return;
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      const [sessionsRes, flashcardsRes, settingsRes] = await Promise.all([
        supabase.from('study_sessions').select('duration, focus_level, created_at').eq('user_id', user.id),
        supabase.from('flash_cards').select('id').eq('user_id', user.id),
        supabase.from('user_study_preferences').select('daily_goal_hours').eq('user_id', user.id).single(),
      ]);

      if (sessionsRes.error) throw sessionsRes.error;
      if (flashcardsRes.error) throw flashcardsRes.error;

      const allSessions = sessionsRes.data || [];
      const todaySessions = allSessions.filter(s => {
        const date = new Date(s.created_at);
        return date >= todayStart && date < todayEnd;
      });

      const todayStudyTime = todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      const totalStudyTime = allSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
      const streakDays = calculateStreak(allSessions);
      const focusScores = allSessions.map(s => s.focus_level || 3);
      const focusScore = focusScores.length
        ? Number((focusScores.reduce((a, b) => a + b, 0) / focusScores.length).toFixed(1))
        : 0;
      const completedSessions = allSessions.length;
      const flashcardCount = flashcardsRes.data?.length || 0;
      const dailyGoal = settingsRes.data?.daily_goal_hours || 2;

      setStudyStats({
        dailyGoal,
        todayStudyTime,
        totalStudyTime,
        streakDays,
        focusScore,
        completedSessions,
        flashcardCount,
      });
    } catch (err) {
      console.error('Error refreshing study stats:', err);
    }
  }, [user]);

  const calculateStreak = (sessions) => {
    if (!sessions.length) return 0;
    const uniqueDates = [...new Set(sessions.map(s => new Date(s.created_at).toDateString()))];
    const sortedDates = uniqueDates.map(d => new Date(d)).sort((a, b) => b - a);
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    for (let date of sortedDates) {
      const diff = (currentDate - date) / (1000 * 60 * 60 * 24);
      if (diff === 0 || diff === 1) {
        streak++;
        currentDate = date;
      } else break;
    }
    return streak;
  };

  // ✅ Function version – required by HomeScreen
  const getStudyProgress = useCallback(() => {
    if (studyStats.dailyGoal === 0) return 0;
    return Math.min(studyStats.todayStudyTime / (studyStats.dailyGoal * 3600), 1);
  }, [studyStats.todayStudyTime, studyStats.dailyGoal]);

  const studyProgress = useMemo(() => getStudyProgress(), [getStudyProgress]);

  const value = {
    studyStats,
    studyProgress,   // kept for compatibility, but HomeScreen uses getStudyProgress
    getStudyProgress, // ✅ added – this is what HomeScreen expects
    refreshStats,
  };

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
};

export const useStudy = () => {
  const context = useContext(StudyContext);
  if (!context) throw new Error('useStudy must be used within StudyProvider');
  return context;
};