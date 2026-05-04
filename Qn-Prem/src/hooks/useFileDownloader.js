import { useCallback } from 'react';
import axios from 'axios';

/**
 * handle file downloading.
 * @returns {Function}
 */
export const useFileDownloader = () => {
  const downloadFile = useCallback(async (url, fileName = 'downloaded-file.pdf') => {
    try {
      const response = await axios.get(url, {
        responseType: 'blob',
      });

      const blobUrl = URL.createObjectURL(response.data);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();

      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('File download failed:', error);
    }
  }, []);

  return downloadFile;
};

