import {
  CheckCircleFilled,
  CloseCircleFilled,
  ExpandOutlined,
  CloseOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { Button, Flex, Spin, Tag, Typography, Modal } from "antd";
import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { assets } from "../assets";
import AppHeader from "../components/layouts/AppHeader/AppHeader";
import PdfViewer from "../components/pdf/PdfViewer";
// Add a DOCX viewer component. Replace with your actual implementation or install a package like react-doc-viewer.
import DocxViewer from "../components/pdf/DocxViewer";
import PowerPointViewer from "../components/pdf/PowerPointViewer";
import { qnAPI } from "../api";
import { API_BASE_URL } from "../api/config";
import styles from "@/features/decisionSupport/DecisionSupport.module.css";
import HistoricalQnCard from "@/features/decisionSupport/HistoricalQnCard";
import QnComparisonDrawer from "@/features/decisionSupport/QnComparisonDrawer";
import QnDocList from "@/features/decisionSupport/QnDocList";
import CustomDropdown from "../components/ui/CustomDropdown/CustomDropdown";
import ScrollableContainer from "../components/ui/ScrollableContainer";
import UpdateQnStatusModal from "@/features/decisionSupport/UpdateQnStatusModal";
import { StatusClass, StatusTitle } from "../constants";
import {useBodyScrollLock} from "../hooks/useBodyScrollLock";
import {useIsMobile} from "../hooks/useIsMobile";
import { setAnalyseData } from "../state/decisionSlice";
import { fetchQnData, setSelectedQnByNumber } from "../state/qnSlice";
import QNInfoModal from "@/features/decisionSupport/QNInfoModal";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import useMessageApi from "@/hooks/useMessageApi";
import Chatbot2 from "@/features/Chatbot2/Chatbot2";
import { getFileIcon } from "@/utils/fileIconUtils";

const { Text, Paragraph } = Typography;

const DecisionSupport = () => {
  useDocumentMeta({
    title: "Decision Support | QN Automation",
    description: "Decision Support",
    keywords: "QN, QN Automation, Decision Support, Cyient"
  });
  const isMobile = useIsMobile();
  useBodyScrollLock(!isMobile);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { contextHolder, success } = useMessageApi();


  const { data, selectedQn, qnOptions, selectedOptionValue } = useSelector(
    (state) => state.qn
  );
  const { currentQNFiles, refQnDoc, historicalQn, analyseData } = useSelector(
    (state) => state.decision
  );
  const {username} = useSelector((state) => state.auth.data);


  const [openDrawer, setOpenDrawer] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [selectedHistoricalQnForComparison, setSelectedHistoricalQnForComparison] = useState(null);
  const [selectedHistoricalQn, setSelectedHistoricalQn] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isStatusModal, setIsStatusModal] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [updateStatus, setUpdateStatus] = useState("");
  const [loadingUpdateStatus, setLoadingUpdateStatus] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isFullscreenViewer, setIsFullscreenViewer] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  
  // Ref to track the last processed QN to prevent duplicate API calls
  const lastProcessedQnRef = useRef(null);
  // Fetch PDF file from getfile API
  const fetchPdfFile = async (filepath) => {
    if (!filepath) {
      setPdfUrl("");
      return;
    }
    try {
      // Use the createFileUrl function to construct the file URL
      const fileUrl = createFileUrl(filepath);
      setPdfUrl(fileUrl);
    } catch (error) {
      setPdfUrl("");
      console.error("Failed to fetch PDF file:", error);
    }
  };

  const handleHistoricalQnSelection = (itemId, isSelected) => {
    if (isSelected) {
      setSelectedHistoricalQn(itemId);
    } else {
      setSelectedHistoricalQn(null);
    }
  };

  // Clear selections when QN changes
  const clearHistoricalQnSelections = () => {
    setSelectedHistoricalQn(null);
  };

  const fetchQnAnalysis = async (qn) => {
    if (!qn || !qn.QN) return;
    
    // Prevent duplicate calls for the same QN
    if (lastProcessedQnRef.current === qn.QN) {
      console.log('Skipping duplicate API call for QN:', qn.QN);
      return;
    }
    
    lastProcessedQnRef.current = qn.QN;
    setLoading(true);
    
    try {
      console.log('Calling search_qn API for QN:', qn.QN);
      const res = await qnAPI.postQnAnalyse(qn);
      dispatch(setAnalyseData(res.data));
    } catch (error) {
      console.error("Analysis fetch failed:", error);
      // Reset the ref on error so it can be retried
      lastProcessedQnRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!data?.length) {
      dispatch(fetchQnData());
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedQn) {
      // Clear selected PDF when QN changes to prevent showing stale data
      setSelectedPdf(null);
      fetchQnAnalysis(selectedQn);
      // Clear historical QN selections when QN changes
      clearHistoricalQnSelections();
    }
  }, [selectedQn]);

  // Auto-select first available document when data changes
  useEffect(() => {
    if (currentQNFiles !== undefined) {
      if (currentQNFiles && currentQNFiles.length > 0) {
        // If current documents exist, select first current document
        setSelectedPdf(currentQNFiles[0]);
      } else if (refQnDoc?.length > 0) {
        // If no current documents, select first reference document if available
        setSelectedPdf(refQnDoc[0]);
      } else {
        // If no documents at all, clear the selection
        setSelectedPdf(null);
      }
    }
  }, [currentQNFiles, refQnDoc]);

  useEffect(() => {
    if (selectedPdf?.filepath) {
      fetchPdfFile(selectedPdf.filepath);
    } else {
      setPdfUrl("");
    }
  }, [selectedPdf]);

  const handleQnOptionChange = (value) =>
    dispatch(setSelectedQnByNumber(value));
  const handleselectedFile = (val) => setSelectedPdf(val);

  // Handle design/structure icon clicks
  const handleDesignClick = () => {
    if (selectedQn && selectedQn["qn_output_design"]) {
      const filepath = selectedQn["qn_output_design"];
      // Extract filename from filepath (get everything after the last slash or backslash)
      const filename = filepath.split(/[/\\]/).pop() || `${selectedQn.QN}_design.pptx`;
      
      const designFile = {
        filename: filename,
        filepath: filepath
      };
      setSelectedPdf(designFile);
    }
  };

  const handleStructureClick = () => {
    if (selectedQn && selectedQn["qn_output_structure"]) {
      const filepath = selectedQn["qn_output_structure"];
      // Extract filename from filepath (get everything after the last slash or backslash)
      const filename = filepath.split(/[/\\]/).pop() || `${selectedQn.QN}_structure.pptx`;
      
      const structureFile = {
        filename: filename,
        filepath: filepath
      };
      setSelectedPdf(structureFile);
    }
  };

  // Handle design file download
  const handleDesignDownload = (e) => {
    e.stopPropagation(); // Prevent triggering the view click
    if (selectedQn && selectedQn["qn_output_design"]) {
      const filepath = selectedQn["qn_output_design"];
      const filename = filepath.split(/[/\\]/).pop() || `${selectedQn.QN}_design.pptx`;
      const downloadUrl = createDownloadUrl(filepath);
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Handle structure file download
  const handleStructureDownload = (e) => {
    e.stopPropagation(); // Prevent triggering the view click
    if (selectedQn && selectedQn["qn_output_structure"]) {
      const filepath = selectedQn["qn_output_structure"];
      const filename = filepath.split(/[/\\]/).pop() || `${selectedQn.QN}_structure.pptx`;
      const downloadUrl = createDownloadUrl(filepath);
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const onChangeStatus = (status) => {
    setUpdateStatus(status);
    setIsStatusModal(true);
  };

  const handleStatusSubmit = () => {
    if (!selectedQn || !selectedQn.QN) {
      console.error('No QN selected for status update');
      return;
    }
    
    setLoadingUpdateStatus(true);
    
    // Find the selected historical QN object to get its filepath
    const selectedHistoricalQnObject = historicalQn?.find(qn => qn._id === selectedHistoricalQn);
    
    // Show preparation message
    success('Disposition package is getting ready...', 3);
    
    // Add a 3-second delay to simulate package preparation
    setTimeout(() => {
      qnAPI
        .updateQNStatus({
          qn: selectedQn.QN,
          status: updateStatus,
          feedback: feedback,
          historyQNId: selectedHistoricalQn, // Include selected historical QN
          design: selectedHistoricalQnObject?.design ?  true : false, // Include design of selected historical QN
          structures: selectedHistoricalQnObject?.structure ?  true : false // Include design of selected historical QN
        })
        .then(async () => {
          success('Status Updated Successfully');
          // Clear feedback after successful update
          setFeedback("");
          // Clear historical QN selection after successful update
          clearHistoricalQnSelections();
          // Reset the ref to allow refetching after status update
          lastProcessedQnRef.current = null;
          
          // Refresh the data by calling both APIs
          try {
            // 1. Refresh the menu data (QN list)
            await dispatch(fetchQnData());
            
            // 2. Refresh the current QN analysis data
            await fetchQnAnalysis(selectedQn);
            
            console.log('Data refreshed successfully after status update');
          } catch (error) {
            console.error('Error refreshing data after status update:', error);
          }
        })
        .catch((error) => {
          console.error('Error updating status:', error);
          success('Failed to update status. Please try again.', 5);
        })
        .finally(() => {
          setLoadingUpdateStatus(false);
          setIsStatusModal(false);
        });
    }, 5000); // 3-second delay
  };

  const createFileUrl = (filepath) => {
    return `${API_BASE_URL}/getfile?filepath=${encodeURIComponent(filepath)}`;
  }

  // Helper function for download URLs
  const createDownloadUrl = (filepath) => {
    return `${API_BASE_URL}/download?filepath=${encodeURIComponent(filepath)}`;
  }

  // Helper to get file extension
  const getFileExtension = (filename) => {
    if (!filename) return "";
    return filename.split('.').pop().toLowerCase();
  };

  // Render document viewer based on file type
  const renderDocumentViewer = (selectedPdf, height = "calc(100vh - 300px)") => {
    if (!selectedPdf) return null;
    
    const ext = getFileExtension(selectedPdf?.filename);
    const fileUrl = createFileUrl(selectedPdf?.filepath);
    
    if (ext === "pdf") {
      return (
        <PdfViewer
          fileUrl={fileUrl}
          height={height}
        />
      );
    } else if (ext === "docx" || ext === "doc") {
      return (
        <DocxViewer
          fileUrl={fileUrl}
          height={height}
        />
      );
    } else if (ext === "pptx" || ext === "ppt") {
      return (
        <PowerPointViewer
          fileUrl={fileUrl}
          fileName={selectedPdf?.filename}
          height={height}
        />
      );
    } else if (ext === "msg") {
      // Open MSG files directly in Outlook
      window.open(createFileUrl(selectedPdf?.filepath), '_blank');
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: height,
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f5f5f5',
          border: '2px dashed #ccc',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>Opening in Outlook...</h3>
          <p style={{ margin: '0 0 16px 0', color: '#666' }}>
            {selectedPdf.filename}
          </p>
          <p style={{ margin: '0', color: '#888', fontSize: '14px' }}>
            The MSG file is being opened in Microsoft Outlook.<br/>
            If it doesn't open automatically, click the button below.
          </p>
          <button
            onClick={() => window.open(createFileUrl(selectedPdf?.filepath), '_blank')}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Open in Outlook
          </button>
        </div>
      );
    } else {
      return <div>Unsupported file type: {ext}</div>;
    }
  };

  const renderSubHeader = () => (
    <section className={styles.subHeader}>
      <Flex gap="small" justify="space-between" align="center" wrap="wrap">
        <Flex gap="small" align="center">
          <Text className={styles.userTitle}>
            Decision Support
            <Paragraph className={styles.userSubTitle}>
              Select QN (Quality Notification) number :
            </Paragraph>
          </Text>
          <CustomDropdown
            onChange={handleQnOptionChange}
            options={qnOptions}
            value={selectedOptionValue}
          />
        </Flex>
        <Flex gap="small">
          <Button
            size="medium"
            danger
            icon={<CloseCircleFilled />}
            onClick={() => onChangeStatus("reject")}
            disabled={["accept", "reject", "Closed"].includes(
              selectedQn?.status
            ) || !selectedHistoricalQn}
          >
            Reject
          </Button>
          <Button
            className="btn-accept"
            size="medium"
            icon={<CheckCircleFilled />}
            onClick={() => onChangeStatus("accept")}
            disabled={["accept", "reject", "Closed"].includes(
              selectedQn?.status
            ) || !selectedHistoricalQn}
          >
            Accept
          </Button>
          {/* <Button
            icon={<WechatWorkOutlined style={{ marginTop: "3px" }} />}
            style={{
              backgroundColor: "#4aa6db",
              color: "white",
              borderRadius: "5px",
              height: "30px",
            }}
            onClick={() => setIsChatModalOpen(true)}
          ></Button> */}
        </Flex>
      </Flex>
    </section>
  );
  const renderDetails = () => (
    <section className={styles.basicDetails}>
      <div className="flex gap-1 flex-col">
        <div className="flex flex-row gap-1">
          <b>MQI:</b> <span> {selectedQn && selectedQn["MQI"]}</span>
        </div>
        <div className="flex flex-row">
          <b>Part No:</b> <span> {selectedQn && selectedQn["Part Number"]}</span>
        </div>
        <div className="flex flex-row">
          <b>Short Text:</b> <span> {selectedQn && selectedQn["Short Text"]}</span>
        </div>
        
      </div>
      
      <div className="flex gap-1">
        <b>Long Text:</b>
        <span>{selectedQn && selectedQn["Long Text"]}</span>
      </div>
      {
        (selectedQn["status"] === 'accept' || selectedQn["status"] === 'reject') && (
          <div className="flex flex-col  gap-1">
            <b>Reccomendation</b>
            <div>
              <span className="primary-text font-bold">
                {selectedQn && selectedQn["recommendation"] ? selectedQn["recommendation"] : 'N/A'}
              </span>
            </div>
          </div>
        )
      }
      <div className="flex gap-1 flex-col">
        <div className="flex gap-1">
          <b>Status:</b>{" "}
          <span className={`${selectedQn && selectedQn["status"] ? StatusClass[selectedQn["status"]] : ''} font-bold`}>
            {selectedQn && selectedQn["status"] ? StatusTitle[selectedQn["status"]] : 'N/A'}
          </span>
        </div>
        {/* Show design and structure icons when status is accept or reject */}
        {selectedQn && ["accept", "reject"].includes(selectedQn["status"]) && (
          <div className="flex gap-2 mt-1">
            {
              selectedQn && selectedQn["qn_output_design"] && (
                <div className="flex gap-1 items-center">
                  <div 
                    className="flex gap-1 items-center" 
                    title="Design - Click to view"
                    onClick={handleDesignClick}
                    style={{ cursor: 'pointer' }}
                  >
                    <img src={assets.design} alt="Design" style={{ width: '16px', height: '16px' }} />
                    <span style={{ fontSize: '12px', color: '#666' }}>Design</span>
                  </div>
                  <Button
                    type="text"
                    icon={<DownloadOutlined />}
                    onClick={handleDesignDownload}
                    title="Download Design File"
                    size="small"
                    style={{
                      padding: '2px 4px',
                      height: '20px',
                      minWidth: '20px',
                      color: '#1890ff'
                    }}
                  />
                </div>
              )
            }
            {
              selectedQn && selectedQn["qn_output_structure"] && (
                <div className="flex gap-1 items-center">
                  <div 
                    className="flex gap-1 items-center" 
                    title="Structures - Click to view"
                    onClick={handleStructureClick}
                    style={{ cursor: 'pointer' }}
                  >
                    <img src={assets.structure} alt="Structures" style={{ width: '16px', height: '16px' }} />
                    <span style={{ fontSize: '12px', color: '#666' }}>Structures</span>
                  </div>
                  <Button
                    type="text"
                    icon={<DownloadOutlined />}
                    onClick={handleStructureDownload}
                    title="Download Structure File"
                    size="small"
                    style={{
                      padding: '2px 4px',
                      height: '20px',
                      minWidth: '20px',
                      color: '#1890ff'
                    }}
                  />
                </div>
              )
            }
          </div>
        )}
      </div>
    </section>
  );

  return (
    <>
    {contextHolder}
    <div className={styles.decisionWrapper}>
      <AppHeader />
      <Spin spinning={loading}>
        <main>
          {/* Sub Header */}
          {renderSubHeader()}
          <UpdateQnStatusModal
            open={isStatusModal}
            onCancel={() => setIsStatusModal(false)}
            onSubmit={handleStatusSubmit}
            feedback={feedback}
            setFeedback={setFeedback}
            loading={loadingUpdateStatus}
          />

          {/* Basic Details */}
          {selectedQn && renderDetails()}
          {/* Main Document Sections */}
          <section className={styles.supportWindows}>
            <div className={styles.first}>
              <ScrollableContainer>
                <QnDocList
                  title="Current QN Documents"
                  items={currentQNFiles}
                  defaultFile={selectedPdf?.filename}
                  selectedItem={handleselectedFile}
                  headerStyle={{justifyContent: 'start', gap: 10}}
                  open={true}
                  onToggle={null}
                  enableGrouping={false}
                />
                <QnDocList
                  title="Reference QN Documents"
                  items={refQnDoc}
                  defaultFile={selectedPdf?.filename}
                  selectedItem={handleselectedFile}
                  headerStyle={{justifyContent: 'start', gap: 10}}
                  open={true}
                  onToggle={null}
                />
              </ScrollableContainer>
            </div>

            <div className={styles.middle}>
              <div className={styles.title}>
                {
                    selectedPdf && (
                      <div className="flex gap-2 justify-between items-center w-full">
                        <div className="flex gap-2">
                          <span className={styles.fileIconWrapper}>
                            {getFileIcon(selectedPdf.filename)}
                          </span>
                          {selectedPdf && <> {selectedPdf["filename"]}</>}
                        </div>
                        <Button
                          type="primary"
                          icon={<ExpandOutlined />}
                          onClick={() => setIsFullscreenViewer(true)}
                          title="View in Fullscreen"
                          size="small"
                          style={{
                            backgroundColor: '#ffffff',
                            borderColor: '#d9d9d9',
                            color: '#595959',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: '500'
                          }}
                        >
                          Fullscreen
                        </Button>
                      </div>
                    )
                }
              </div>
              <div className={styles.body}>
                {selectedPdf ? renderDocumentViewer(selectedPdf) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 'calc(100vh - 300px)',
                    padding: '20px',
                    textAlign: 'center',
                    backgroundColor: '#f5f5f5',
                    border: '2px dashed #ccc',
                    borderRadius: '8px',
                    color: '#888'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
                    <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>No Document Selected</h3>
                    <p style={{ margin: '0', fontSize: '14px' }}>
                      Please select a document from the left panel to view it here.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.last}>
              <div className={styles.title}>
                <span>Historical QNs</span>
                <Tag className={styles.decisionTag}>{historicalQn?.length || 0}</Tag>
              </div>
              <ScrollableContainer className={`${styles.body}`}>
                {historicalQn && historicalQn.length > 0 ? (
                  historicalQn.map((item, index) => (
                    <HistoricalQnCard
                      item={item}
                      key={index}
                      isSelected={selectedHistoricalQn === item._id}
                      onSelectionChange={handleHistoricalQnSelection}
                      handleCompareClick={(selectedItem) => {
                        setSelectedHistoricalQnForComparison(selectedItem);
                        setOpenDrawer(true);
                      }}
                      handleViewPdf={(pdfInfo) => setSelectedPdf(pdfInfo)}
                    />
                  ))
                ) : (
                  <div style={{ padding: "16px", color: "#888" }}>
                    Historical QN's are not matching with current QN.
                  </div>
                )}
              </ScrollableContainer>
            </div>
          </section>
          <QnComparisonDrawer
            onClose={() => {
              setOpenDrawer(false);
              setSelectedHistoricalQnForComparison(null);
            }}
            open={openDrawer}
            preselectedHistoricalQn={selectedHistoricalQnForComparison}
          />
          {selectedQn && (
            <QNInfoModal
              open={isChatModalOpen}
              onClose={() => setIsChatModalOpen(false)}
              selectedQn={selectedQn}
            />
          )}
          {selectedQn && (
            <Chatbot2
              QN={selectedQn.QN}
              username={username}
            />
          )}
          
          {/* Fullscreen Document Viewer Modal */}
          <Modal
            title={
              <div className="flex justify-between items-center" style={{ backgroundColor: '#1890ff', padding: '8px 16px', margin: '-16px -24px 16px -24px' }}>
                <div className="flex gap-2 items-center" style={{ color: 'white' }}>
                  {selectedPdf && (
                    <>
                      <span>{getFileIcon(selectedPdf.filename)}</span>
                      <span>{selectedPdf.filename}</span>
                    </>
                  )}
                </div>
                <Button
                  type="text"
                  icon={<CloseOutlined style={{ fontSize: '16px', color: 'white' }} />}
                  onClick={() => setIsFullscreenViewer(false)}
                  style={{ 
                    color: '#fff', 
                    border: 'none',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '4px'
                  }}
                  size="large"
                />
              </div>
            }
            open={isFullscreenViewer}
            onCancel={() => setIsFullscreenViewer(false)}
            footer={null}
            width="100vw"
            style={{ 
              top: 0, 
              padding: 0,
              maxWidth: '100vw'
            }}
            bodyStyle={{ 
              height: 'calc(100vh - 80px)', 
              padding: 0,
              overflow: 'hidden',
              backgroundColor: '#f5f5f5'
            }}
            closable={false}
            maskClosable={true}
            destroyOnClose={true}
          >
            {selectedPdf && renderDocumentViewer(selectedPdf, 'calc(100vh - 80px)')}
          </Modal>
        </main>
      </Spin>
    </div>
    </>
  );
};

export default DecisionSupport;
