import React, { useState, useEffect, useRef } from "react";
import { Spin, Alert, Button, Tabs } from "antd";
import { renderAsync } from "docx-preview";

// DOCX viewer that renders document content using docx-preview
const DocxViewer = ({ fileUrl, height = "600px" }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileBlob, setFileBlob] = useState(null);
  const [renderMethod, setRenderMethod] = useState("preview");
  const previewRef = useRef(null);

  useEffect(() => {
    if (!fileUrl) return;

    const fetchFile = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status}`);
        }

        const blob = await response.blob();
        setFileBlob(blob);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching DOCX file:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFile();
  }, [fileUrl]);

  useEffect(() => {
    if (fileBlob && renderMethod === "preview" && previewRef.current) {
      renderDocxPreview();
    }
  }, [fileBlob, renderMethod]);

  const renderDocxPreview = async () => {
    if (!fileBlob || !previewRef.current) return;

    try {
      // Clear previous content
      previewRef.current.innerHTML = '';
      
      // Convert blob to ArrayBuffer for docx-preview
      const arrayBuffer = await fileBlob.arrayBuffer();
      
      // Render the DOCX content
      await renderAsync(arrayBuffer, previewRef.current, null, {
        className: "docx-preview",
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        ignoreLastRenderedPageBreak: true,
        experimental: false,
        trimXmlDeclaration: true,
        useBase64URL: false,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true
      });
    } catch (err) {
      console.error('Error rendering DOCX preview:', err);
      setError(`Failed to render DOCX preview: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error && renderMethod === "preview") {
    return (
      <div style={{ padding: '20px' }}>
        <Alert
          message="Error loading DOCX file"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => setRenderMethod("download")}>
              Try Download Option
            </Button>
          }
        />
      </div>
    );
  }

  if (fileBlob) {
    const blobUrl = URL.createObjectURL(fileBlob);
    
    const renderPreviewViewer = () => {
      return (
        <div style={{ 
          height, 
          overflow: 'auto', 
          border: '1px solid #d9d9d9', 
          borderRadius: '6px',
          padding: '20px',
          backgroundColor: '#fff'
        }}>
          <div 
            ref={previewRef}
            style={{
              fontFamily: 'Arial, sans-serif',
              lineHeight: '1.6',
              color: '#333'
            }}
          />
        </div>
      );
    };

    const tabItems = [
      {
        key: 'preview',
        label: 'Document Preview',
        children: renderPreviewViewer(),
      }
    ];

    return (
      <div style={{ height }}>
        <Tabs 
          activeKey={renderMethod} 
          onChange={setRenderMethod}
          items={tabItems}
          style={{ height: '100%' }}
        />
      </div>
    );
  }

  return null;
};

export default DocxViewer;
