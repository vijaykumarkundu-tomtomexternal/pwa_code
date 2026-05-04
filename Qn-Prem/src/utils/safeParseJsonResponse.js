export const  safeParseJsonResponse = (data) =>  {
    try {
      const sanitized = data.replace(/\bNaN\b/g, 'null');
      return JSON.parse(sanitized);
    } catch (e) {
      console.error('Failed to parse sanitized response:', e);
      return data;
    }
  }