import React from 'react';
import * as ExcelJS from 'exceljs';
import dayjs from 'dayjs';
import { DownloadOutlined } from '@ant-design/icons';

const ExcelExporter = ({ 
  data, 
  filename = 'export', 
  buttonText = 'Export to Excel',
  buttonClassName = '',
  onExportStart,
  onExportComplete,
  onExportError 
}) => {
  
  const exportToExcel = async () => {
    try {
      if (onExportStart) onExportStart();
      
      // Create a new workbook using ExcelJS
      const workbook = new ExcelJS.Workbook();
      
      // Set workbook properties
      workbook.creator = 'MQI Analysis System';
      workbook.lastModifiedBy = 'MQI Analysis System';
      workbook.created = new Date();
      workbook.modified = new Date();

      // Create single worksheet for MQI Details
      const worksheet = workbook.addWorksheet('MQI Details');
      
      // Add table headers
      const headerRow = worksheet.addRow(['S.No', 'MQI', 'Occurrences', 'Defect Code', 'Short Text', 'Root Causes', 'Corrective Action']);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' }
      };
      headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };

      // Add table data
      data.forEach((row, idx) => {
        worksheet.addRow([
          idx + 1,
          row.MQI || '',
          row.count || 0,
          row.defect_code || '-',
          row.short_text || '-',
          row.root_causes || '-',
          row.corrective_action || '-'
        ]);
      });

      // Set column widths
      worksheet.getColumn(1).width = 8;  // S.No
      worksheet.getColumn(2).width = 15; // MQI
      worksheet.getColumn(3).width = 12; // Occurrences
      worksheet.getColumn(4).width = 15; // Defect Code
      worksheet.getColumn(5).width = 30; // Short Text
      worksheet.getColumn(6).width = 30; // Root Causes
      worksheet.getColumn(7).width = 30; // Corrective Action

      // Generate filename with timestamp
      const timestamp = dayjs().format('YYYYMMDD_HHmmss');
      const finalFilename = `${filename}_${timestamp}.xlsx`;

      // Write file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Download the file
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = finalFilename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Log success message
      console.log(`Export completed: ${finalFilename} - ${data.length} rows exported`);

      if (onExportComplete) onExportComplete(finalFilename);

    } catch (error) {
      console.error('Excel export failed:', error);
      
      if (onExportError) onExportError(error);
    }
  };

  const buttonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#fff',
    backgroundColor: '#1677ff',
    border: '1px solid #1677ff',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1)',
    textDecoration: 'none',
    outline: 'none',
    lineHeight: '1.5',
    boxShadow: '0 2px 0 rgba(5, 145, 255, 0.1)'
  };

  const hoverStyle = {
    backgroundColor: '#4096ff',
    borderColor: '#4096ff',
    boxShadow: '0 2px 0 rgba(5, 145, 255, 0.2)'
  };

  const activeStyle = {
    backgroundColor: '#0958d9',
    borderColor: '#0958d9',
    boxShadow: '0 2px 0 rgba(5, 145, 255, 0.12)'
  };

  return (
    <button 
      onClick={exportToExcel}
      className={buttonClassName || ''}
      type="button"
      style={buttonClassName ? {} : buttonStyle}
      onMouseEnter={(e) => {
        if (!buttonClassName) {
          Object.assign(e.target.style, { ...buttonStyle, ...hoverStyle });
        }
      }}
      onMouseLeave={(e) => {
        if (!buttonClassName) {
          Object.assign(e.target.style, buttonStyle);
        }
      }}
      onMouseDown={(e) => {
        if (!buttonClassName) {
          Object.assign(e.target.style, { ...buttonStyle, ...activeStyle });
        }
      }}
      onMouseUp={(e) => {
        if (!buttonClassName) {
          Object.assign(e.target.style, { ...buttonStyle, ...hoverStyle });
        }
      }}
    >
      <DownloadOutlined style={{ fontSize: '12px' }} />
      {buttonText}
    </button>
  );
};

export default ExcelExporter;