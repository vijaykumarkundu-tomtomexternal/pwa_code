import { useState } from 'react';
import axios from 'axios';

const useFileUpload = (uploadUrl = 'http://localhost:5070/qnupload') => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setStatus('');
    setProgress(0);
    setError(null);
  };

  const upload = async () => {
    if (!file) {
      setStatus('No file selected');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setStatus('Uploading...');
      setProgress(0);

      const res = await axios.post(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / e.total);
          setProgress(percent);
        }
      });

      setStatus('Upload successful');
      return res.data;
    } catch (err) {
      console.error(err);
      setStatus('Upload failed');
      setError(err);
    }
  };

  return {
    file,
    status,
    progress,
    error,
    handleFileChange,
    upload,
  };
};

export default useFileUpload;
