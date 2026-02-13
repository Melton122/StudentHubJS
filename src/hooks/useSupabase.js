import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export const useSupabase = (table, query = {}) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      let request = supabase.from(table).select('*');
      Object.keys(query).forEach((key) => {
        request = request.eq(key, query[key]);
      });
      const { data, error } = await request;
      if (error) throw error;
      setData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { data, error, loading, refetch: fetchData };
};