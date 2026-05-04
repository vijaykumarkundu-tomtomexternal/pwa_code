import { useState, useEffect } from 'react';
import { getQNInsights} from '@/api/qn'
import axios from 'axios';  // Import Axios


/**
 * useQNInsights
 * @param {string} apiUrl
 * @param {{ startDate?: string, endDate?: string }} params
 */
const useQNInsights = (apiUrl = "/mqi_counts_by_part", params = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Send all params in body if provided
        const response = await getQNInsights({
          ...params,
        });
        setData(response.data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // Use JSON.stringify to ensure stable dependency array
  }, [apiUrl, JSON.stringify(params)]);

  return { data, loading, error };
};

export default useQNInsights;
