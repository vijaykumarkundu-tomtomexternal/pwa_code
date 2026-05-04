import { CloseOutlined, DownOutlined, UpOutlined } from "@ant-design/icons";
import { Drawer, Dropdown } from "antd";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { assets } from "../../assets";
import { useDownloadQN } from "../../hooks/useDownloadQN";
import CustomDropdown from "../../components/ui/CustomDropdown/CustomDropdown";
import RenderDescriptions from "../../components/ui/RenderDescriptions";
import PdfViewer from "../../components/pdf/PdfViewer";
import styles from "./DecisionSupport.module.css";
import { getFileIcon } from "../../utils/fileIconUtils";

// Custom component to render QN details with mixed layout
const QNDetailsRenderer = ({ details }) => {
  const { gridItems, fullRowItems } = details;
  
  return (
    <div>
      {/* Grid layout for regular items */}
      {gridItems.length > 0 && <RenderDescriptions items={gridItems} />}
      
      {/* Full row layout for text fields */}
      {fullRowItems.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          {fullRowItems.map((item, index) => (
            <div key={index} style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '4px',
                color: '#333'
              }}>
                {item.label}:
              </div>
              <div style={{
                fontSize: '14px',
                lineHeight: '1.4',
                padding: '8px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                overflowWrap: 'break-word'
              }}>
                {item.value || 'N/A'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const FilesDropdown = ({
  items,
  onItemClick,
  selectedItem,
  placement = "bottom",
  className = "",
}) => {
  const [open, setOpen] = useState(false);

  // Get the appropriate icon for the selected file
  const fileIcon = getFileIcon(selectedItem?.label);

  return (
    <Dropdown
      menu={{ items, onClick: onItemClick }}
      placement={placement}
      onOpenChange={setOpen}
      trigger={["click"]}
    >
      <div className={`${styles.qnFileHeader} ${className}`}>
        <div className="flex gap-2 white-text" style={{ alignItems: 'center' }}>
          {fileIcon}
          <span>{selectedItem?.label || "Select"}</span>
        </div>
        {open ? (
          <UpOutlined style={{ color: "white" }} />
        ) : (
          <DownOutlined style={{ color: "white" }} />
        )}
      </div>
    </Dropdown>
  );
};

const QnComparisonDrawer = ({ open, onClose, preselectedHistoricalQn }) => {
  const { selectedQn } = useSelector((state) => state.qn);
  const { historicalQnOptions, historicalQn, currentQnDoc, historyQNFiles } =
    useSelector((state) => state.decision);
    
  // eslint-disable-next-line no-unused-vars
  const downloadQN = useDownloadQN();

  const [selectedCurrentFile, setSelectedCurrentFile] = useState("");
  const [selectedHistoryFile, setSelectedHistoryFile] = useState("");
  const [selectedHistoryQnValue, setSelectedHistoryQnValue] = useState(null);
  const [selectedHistoryQN, setSelectedHistoryQN] = useState(null);
  const [detailItems, setDetailItems] = useState({ gridItems: [], fullRowItems: [] });
  const [detailHistoryItems, setDetailHistoryItems] = useState({ gridItems: [], fullRowItems: [] });
  const [currentQNFilesOptions, setCurrentQNFilesOptions] = useState([]);
  const [historyQNFilesOptions, setHistoryQNFilesOptions] = useState([]);

  const generateOptionsFromFiles = (files = []) =>
    files.map(({ filename, filepath }) => ({ label: filename, key: filepath }));

  const generateDetailsFromQN = (qn, isHistory = false) => {
    if (!qn) return { gridItems: [], fullRowItems: [] };
    
    const baseItems = isHistory
      ? [
          { label: "MQI", value: qn?.MQI },
          { label: "Defect Code", value: qn["Defect Code"] },
          { label: "Received Date", value: qn["Received Date"] },
          { label: "Part No", value: qn["Part Number"] },
          { label: "Non Conformance", value: qn["Non-conformance"] },
          { label: "Issue Date", value: qn["Issue Date"] },
          { label: "Vendor Code", value: qn["Vendor code"] },
          { label: "Vendor", value: qn["Vendor"] },
          { label: "Serial", value: qn["Serial"] },
          { label: "Zone Location", value: qn["Zone Location"] },
          { label: "Status", value: qn["status"] },
          { label: "Reviewer Feedback", value: qn["Reviewer Feedback"] },
        ]
      : [
          { label: "MQI", value: qn?.MQI },
          { label: "Defect Code", value: qn["Defect Code"] },
          { label: "Received Date", value: qn["Received date"] },
          { label: "Part No", value: qn["Part Number"] },
          { label: "Non Conformance", value: qn["Non Conformance"] },
          { label: "Issue Date", value: qn["Issue date"] },
          { label: "SN", value: qn["SN"] },
          { label: "Vendor Code", value: qn["Vendor Code"] },
          { label: "Vendor", value: qn["Vendor"] },
          { label: "Created Date", value: qn["created_date"] },
          { label: "Zone Location", value: qn["Zone Location"] },
          { label: "Analyse Date", value: qn["analyse_date"] },
          { label: "Rev", value: qn["Rev"] },
          { label: "Accept Date", value: qn["accept_date"] },
          { label: "Reject Date", value: qn["reject_date"] },
        ];

    // Full row items for text fields
    const fullRowItems = [
      { label: "Short Text", value: qn["Short Text"] },
      { label: "Long Text", value: qn["Long Text"] },
    ];

    // Add 502 Disposition Status for history items
    if (isHistory) {
      fullRowItems.push({
        label: "502 Disposition Status",
        value: qn["502 Disposition Status"],
      });
    }

    return { gridItems: baseItems, fullRowItems: fullRowItems.filter(item => item.value) };
  };

  useEffect(() => {
    const items = generateOptionsFromFiles(currentQnDoc);
    console.log(items)
    setCurrentQNFilesOptions(items);
    setSelectedCurrentFile(items[0] || null);
  }, [currentQnDoc]);

  useEffect(() => {
    const items = generateOptionsFromFiles(historyQNFiles);
    console.log(items)
    setHistoryQNFilesOptions(items);
    setSelectedHistoryFile(items[0] || null);
  }, [historyQNFiles]);

  useEffect(() => {
    if (historicalQnOptions?.length) {
      // If a preselected historical QN is provided, use it
      if (preselectedHistoricalQn && preselectedHistoricalQn.QN) {
        setSelectedHistoryQnValue(preselectedHistoricalQn.QN);
      } else {
        // Otherwise, use the first option as default
        setSelectedHistoryQnValue(historicalQnOptions[0]?.value);
      }
    }
  }, [historicalQnOptions, preselectedHistoricalQn]);

  useEffect(() => {
    const foundQN = historicalQn?.find(
      (ele) => ele.QN === selectedHistoryQnValue
    );
    setSelectedHistoryQN(foundQN || null);
  }, [selectedHistoryQnValue, historicalQn]);

  useEffect(() => {
    setDetailHistoryItems(generateDetailsFromQN(selectedHistoryQN, true));
  }, [selectedHistoryQN]);

  useEffect(() => {
    setDetailItems(generateDetailsFromQN(selectedQn));
  }, [selectedQn]);

  const handleQnOptionChange = (value) => setSelectedHistoryQnValue(value);

  const handlePdfSelection = (key, options, setFile) => {
    const selected = options.find((item) => item.key === key);
    setFile(selected || null);
  };

  const handleCurrentPdfOnChange = ({ key }) => {
    handlePdfSelection(key, currentQNFilesOptions, setSelectedCurrentFile);
  };
  const handleHistoryPdfOnChange = ({ key }) => {
    handlePdfSelection(key, historyQNFilesOptions, setSelectedHistoryFile);
  };

  return (
    <Drawer
      width={"90%"}
      title="QN Comparison Information"
      headerStyle={{ backgroundColor: "#1677FF", color: "#fff" }}
      closable={false}
      extra={
        <CloseOutlined
          style={{ color: "#fff", fontSize: "16px" }}
          onClick={onClose}
        />
      }
      onClose={onClose}
      open={open}
    >
      <section className={styles.qnCompare}>
        <div className={styles.qnCompareCard}>
          <div className="flex justify-between items-center">
            <p className="font-bold" style={{fontSize: '16px'}}>
              Current QN :{" "}
              <span className="primary-text">{selectedQn?.QN}</span>
            </p>
          </div>
          <div className={styles.qnCompareCardDetails}>
            <div style={{padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '1rem', height: '100%'}}>
              <h4 style={{margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 'bold', color: '#333'}}>QN Information</h4>
              <div style={{height: '100%'}}>
                <QNDetailsRenderer details={detailItems} />
              </div>
            </div>
            {/* <FilesDropdown
              items={currentQNFilesOptions}
              onItemClick={handleCurrentPdfOnChange}
              selectedItem={selectedCurrentFile}
            />
            <PdfViewer
              fileUrl={selectedCurrentFile?.key}
              height={toogleCurrentQn ? "30vh" : "60vh"}
            /> */}
          </div>
        </div>
        <div className={styles.qnCompareCard}>
          <div className="flex justify-between items-center">
            <div className="font-bold" style={{fontSize: '16px'}}>
              Historical QN :{" "}
              <span className="primary-text">
                <CustomDropdown
                  onChange={handleQnOptionChange}
                  options={historicalQnOptions}
                  value={selectedHistoryQnValue}
                />
              </span>
            </div>
            <div className="flex gap-2">
              {selectedHistoryQN && (
                <p className="font-bold success-text verticalLine" style={{fontSize: '14px'}}>
                  Match: {selectedHistoryQN["Percentage_Closeness"]}%
                </p>
              )}
              {selectedHistoryQN &&
                ["accept", "reject", "Closed"].includes(
                  selectedHistoryQN.status
                ) && (
                  <p
                    className="font-bold cursor-pointer"
                    style={{fontSize: '14px'}}
                    // onClick={() => downloadQN(selectedHistoryQN.QN)}
                  >
                    Disposition:{" "}
                    <span
                      className={
                        ["reject", "Closed"].includes(selectedHistoryQN.status)
                          ? "danger-text"
                          : "success-text"
                      }
                    >
                      {selectedHistoryQN.status === "accept"
                        ? "Accepted"
                        : "Rejected"}
                    </span>
                  </p>
                )}
            </div>
          </div>
          <div className={styles.qnCompareCardDetails}>
            <div style={{padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '1rem', height: '100%'}}>
              <h4 style={{margin: '0 0 1rem 0', fontSize: '16px', fontWeight: 'bold', color: '#333'}}>QN Information</h4>
              <div style={{height: '100%'}}>
                <QNDetailsRenderer details={detailHistoryItems} />
              </div>
            </div>
            {/* <FilesDropdown
              items={historyQNFilesOptions}
              onItemClick={handleHistoryPdfOnChange}
              selectedItem={selectedHistoryFile}
            />
            <PdfViewer
              fileUrl={selectedHistoryFile?.key}
              height={toogleHistoryQn ? "30vh" : "60vh"}
            /> */}
          </div>
        </div>
      </section>
    </Drawer>
  );
};

export default QnComparisonDrawer;
