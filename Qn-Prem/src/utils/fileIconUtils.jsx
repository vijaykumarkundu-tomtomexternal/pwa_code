import React from 'react';
import { FileTextOutlined, FilePdfOutlined, FileWordOutlined, FilePptOutlined, FileExcelOutlined, FileOutlined } from "@ant-design/icons";
import { getFileIconConfig } from './fileUtils';

/**
 * Get appropriate icon component based on file extension
 * @param {string} filename - The filename to check
 * @param {Object} style - Additional styles to apply
 * @returns {JSX.Element} - Appropriate Ant Design icon component
 */
export const getFileIcon = (filename, style = {}) => {
  const config = getFileIconConfig(filename);
  
  const iconStyle = {
    fontSize: '16px',
    color: config.color,
    ...style
  };
  
  switch (config.type) {
    case 'FilePdfOutlined':
      return <FilePdfOutlined style={iconStyle} />;
    case 'FileWordOutlined':
      return <FileWordOutlined style={iconStyle} />;
    case 'FilePptOutlined':
      return <FilePptOutlined style={iconStyle} />;
    case 'FileExcelOutlined':
      return <FileExcelOutlined style={iconStyle} />;
    case 'FileTextOutlined':
      return <FileTextOutlined style={iconStyle} />;
    case 'FileOutlined':
    default:
      return <FileOutlined style={iconStyle} />;
  }
};