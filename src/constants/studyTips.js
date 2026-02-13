export const STUDY_TIPS = [
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

export const getDailyTip = () => {
  const today = new Date().getDate();
  return STUDY_TIPS[today % STUDY_TIPS.length];
};