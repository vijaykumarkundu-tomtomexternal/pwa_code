import React, { useCallback, useState } from "react";
import { Worker } from "@react-pdf-viewer/core";
import { Viewer, SpecialZoomLevel } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

const CustomPdfViewer = ({ fileUrl, showToolbar = true }) => {
  const [error, setError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const defaultLayoutPluginInstance = showToolbar
    ? defaultLayoutPlugin()
    : defaultLayoutPlugin({
        renderToolbar: () => null,
      });

  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoaded(false);
    setReloadKey((prev) => prev + 1);
  }, []);

  if (!fileUrl) {
    return (
      <div style={{ color: "red", display: "grid", placeItems: "center" }}>
        ⚠️ PDF file not provided.
      </div>
    );
  }

  return (
    <div style={{ height: "350px", border: "1px solid #ccc" }}>
      <Worker
        workerUrl={`https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js`}
      >
        <Viewer
          key={reloadKey}
          fileUrl={fileUrl}
          defaultScale={SpecialZoomLevel.PageFit}
          plugins={[defaultLayoutPluginInstance]}
          onDocumentLoad={() => {
            setIsLoaded(true);
            setError(null);
          }}
          onDocumentLoadFail={(err) => {
            console.error("PDF load error:", err);
            setError("❌ Failed to load PDF. Please try again.");
          }}
        />
        {!isLoaded && !error && (
          <p style={{ padding: "8px" }}>Loading PDF...</p>
        )}
        {error && (
          <div>
            <p style={{ color: "red", padding: "8px" }}>{error}</p>
            <button onClick={handleRetry} style={{ marginTop: "8px" }}>
              🔄 Retry
            </button>
          </div>
        )}
      </Worker>
    </div>
  );
};

export default CustomPdfViewer;
