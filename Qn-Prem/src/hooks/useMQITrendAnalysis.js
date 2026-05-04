import { useState, useEffect } from "react";
import { getMQITrendAnalysis } from "@/api/qn";

/**
 * useMQITrendAnalysis
 * @param {string} mqi - The MQI value to fetch trend for
 * @param {Object} dateRange - Date range object with start and end dates
 * @returns { data, loading, error }
 */
const useMQITrendAnalysis = (mqi, dateRange = null) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!mqi) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Prepare API parameters
        const apiParams = { mqi };
        
        // Add date range if provided
        if (dateRange && dateRange.start && dateRange.end) {
          apiParams.start_date = dateRange.start.format('YYYY-MM-DD');
          apiParams.end_date = dateRange.end.format('YYYY-MM-DD');
        }
        
        const resp = await getMQITrendAnalysis(apiParams);
        setData((resp.data && resp.data.monthly_trend) ? resp.data.monthly_trend : []);
      } catch (e) {
        setError("Failed to load trend data");
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [mqi, dateRange?.start?.valueOf(), dateRange?.end?.valueOf()]); // Use valueOf() for proper date comparison

  return { data, loading, error };
};

export default useMQITrendAnalysis;
