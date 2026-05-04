/**
 * Get appropriate icon configuration based on file extension
 * @param {string} filename - The filename to check
 * @returns {Object} - Icon configuration with type and color
 */
export const getFileIconConfig = (filename) => {
  if (!filename) return { type: 'FileOutlined', color: '#1677ff' };
  
  const extension = filename.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'pdf':
      return { type: 'FilePdfOutlined', color: '#d32f2f' };
    case 'doc':
    case 'docx':
      return { type: 'FileWordOutlined', color: '#2e7bd6' };
    case 'ppt':
    case 'pptx':
      return { type: 'FilePptOutlined', color: '#d04423' };
    case 'xls':
    case 'xlsx':
      return { type: 'FileExcelOutlined', color: '#1d7044' };
    case 'txt':
      return { type: 'FileTextOutlined', color: '#666' };
    default:
      return { type: 'FileOutlined', color: '#1677ff' };
  }
};

/**
 * Get file type name based on extension
 * @param {string} filename - The filename to check
 * @returns {string} - File type name
 */
export const getFileType = (filename) => {
  if (!filename) return 'File';
  
  const extension = filename.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'pdf':
      return 'PDF Document';
    case 'doc':
    case 'docx':
      return 'Word Document';
    case 'ppt':
    case 'pptx':
      return 'PowerPoint Presentation';
    case 'xls':
    case 'xlsx':
      return 'Excel Spreadsheet';
    case 'txt':
      return 'Text File';
    default:
      return 'File';
  }
};