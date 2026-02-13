/**
 * Calculate current study streak based on session history
 * @param {Array} sessions - Array of study sessions (must have `created_at`)
 * @returns {number} Current streak in days
 */
export const calculateStreak = (sessions) => {
  if (!sessions || sessions.length === 0) return 0;

  // Get unique dates sorted descending
  const dates = [...new Set(
    sessions.map(s => new Date(s.created_at).toDateString())
  )].sort((a, b) => new Date(b) - new Date(a));

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = Math.abs(prev - curr);
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
};

/**
 * Get streak level based on streak length
 * @param {number} streakDays - Current streak
 * @returns {Object} Level info with label and color
 */
export const getStreakLevel = (streakDays) => {
  if (streakDays >= 30) return { label: 'Legend', color: '#FFD700', emoji: '👑' };
  if (streakDays >= 21) return { label: 'Master', color: '#FF69B4', emoji: '🏆' };
  if (streakDays >= 14) return { label: 'Expert', color: '#6C5CE7', emoji: '🎯' };
  if (streakDays >= 7) return { label: 'Intermediate', color: '#00B894', emoji: '🔥' };
  if (streakDays >= 3) return { label: 'Beginner', color: '#FDCB6E', emoji: '🌱' };
  return { label: 'Newbie', color: '#636E72', emoji: '⭐' };
};