import React from 'react';
import useFileUpload from '../hooks/useFileUpload';

const FileUpload = () => {
  const {
    file,
    status,
    progress,
    error,
    handleFileChange,
    upload
  } = useFileUpload('/qnupload');

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={upload}>Upload</button>

      {file && <p>Selected: {file.name}</p>}
      {status && <p>Status: {status}</p>}
      {progress > 0 && progress < 100 && <p>Progress: {progress}%</p>}
      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}
    </div>
  );
};

export default FileUpload;
