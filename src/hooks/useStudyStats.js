import { useContext } from 'react';
import { StudyContext } from '../context/StudyContext';

export const useStudyStats = () => {
  const context = useContext(StudyContext);
  if (!context) throw new Error('useStudyStats must be used within StudyProvider');
  return context;
};