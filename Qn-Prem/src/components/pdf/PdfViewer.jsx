import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

const PdfViewer = ({ fileUrl, enableSearch = false, height = "295px" }) => {
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: () => [],
    // eslint-disable-next-line no-unused-vars
    renderToolbar: (Toolbar) => (
      <Toolbar>
        {(toolbarSlot) => {
          const {
            Download,
            GoToPreviousPage,
            GoToNextPage,
            ZoomIn,
            CurrentScale,
            ZoomOut,
            NumberOfPages,
            CurrentPageInput,
            EnterFullScreen,
            ShowSearchPopover,
          } = toolbarSlot;
          return (
            <>
              {/* You can remove other toolbar items here */}
              &nbsp;&nbsp;
              {enableSearch && ShowSearchPopover && <ShowSearchPopover />}
              {GoToPreviousPage && <GoToPreviousPage />}
              &nbsp;
              {CurrentPageInput && <CurrentPageInput />}
              of &nbsp;
              {NumberOfPages && <NumberOfPages />}
              {/* &nbsp;&nbsp; */}
              {GoToNextPage && <GoToNextPage />}
              {/* &nbsp; */}
              {ZoomOut && <ZoomOut />}
              &nbsp;
              {CurrentScale && <CurrentScale scale={100} />}
              &nbsp;&nbsp;
              {ZoomIn && <ZoomIn />}
              &nbsp;&nbsp;
              {Download && <Download />}
              &nbsp;&nbsp;
              {EnterFullScreen && <EnterFullScreen />}
            </>
          );
        }}
      </Toolbar>
    ),
  });

  if (!fileUrl) {
    return (
      <div style={{ color: "red", display: "grid", placeItems: "center" }}>
        ⚠️ PDF file not provided.
      </div>
    );
  }

  return (
    <div style={{ height: height, border: "1px solid #ccc" }}>
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
        <Viewer
          defaultScale={0.6}
          fileUrl={fileUrl}
          plugins={[defaultLayoutPluginInstance]}
        />
      </Worker>
    </div>
  );
};

export default PdfViewer;
