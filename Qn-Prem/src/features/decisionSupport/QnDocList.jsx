import { useEffect, useState } from "react";
import styles from "./DecisionSupport.module.css";
import { assets } from "../../assets";
import { List, Tag } from "antd";
import PlusIcon from "@/components/icons/PlusIcon";
import MinusIcon from "@/components/icons/MinusIcon";
import { getFileIcon } from "../../utils/fileIconUtils";

const QnDocList = ({
  title,
  items = [], // Default to empty array to prevent undefined errors
  defaultFile,
  selectedItem,
  headerStyle,
  open = true,
  onToggle,
  enableGrouping = true,
}) => {
  const [selectedFile, setSelectedFile] = useState(defaultFile);

  useEffect(() => {
    setSelectedFile(defaultFile);
  }, [defaultFile]);

  const handleClick = (item) => {
    setSelectedFile(item.filename);
    selectedItem(item);
  };

  // Guard against undefined or null items
  const safeItems = items || [];

  // Conditionally group items by filetype based on enableGrouping prop
  const groupedItems = enableGrouping 
    ? safeItems.reduce((groups, item) => {
        const filetype = item.filetype && item.filetype.trim() !== '' ? item.filetype : 'Other';
        if (!groups[filetype]) {
          groups[filetype] = [];
        }
        groups[filetype].push(item);
        return groups;
      }, {})
    : { 'All': safeItems }; // If grouping disabled, put all items in single group

  // Sort filetypes alphabetically
  const sortedFiletypes = Object.keys(groupedItems).sort();
  return (
    <div className={styles.qnDocSection}>
      <div className={styles.title} style={headerStyle}>
        <span>{title}</span>
        <Tag className={styles.decisionTag}>{safeItems.length}</Tag>
        {onToggle && (
          <div onClick={onToggle} style={{ cursor: "pointer", marginLeft: 'auto' }}>
            {open ? <MinusIcon /> : <PlusIcon />}
          </div>
        )}
      </div>
        {open && (
      <div className={`${styles.body} ${open ? styles.open : styles.closed}`}>
        {sortedFiletypes.map((filetype, index) => (
          <div key={filetype} style={{ marginBottom: index < sortedFiletypes.length - 1 ? '6px' : '0' }}>
            {/* Filetype heading - only show when grouping is enabled and not 'All' */}
            {enableGrouping && filetype !== 'All' && (
              <div style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#666',
                padding: '4px 8px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                marginBottom: '4px',
                textTransform: 'uppercase'
              }}>
                {filetype} ({groupedItems[filetype].length})
              </div>
            )}
            {/* Files for this filetype */}
            <List
              dataSource={groupedItems[filetype]}
              grid={{ gutter: 16, column: 1 }}
              renderItem={(item) => (
                <List.Item onClick={() => handleClick(item)}>
                  <div
                    className={`${styles.currentQnCard}  ${
                      selectedFile == item.filename ? styles.active : ""
                    }`}
                  >
                    <span className={styles.fileIconWrapper}>
                      {getFileIcon(item.filename)}
                    </span>
                    <span className={styles.fileName}>{item.filename}</span>
                  </div>
                </List.Item>
              )}
            />
          </div>
        ))}
      </div>
        )}
    </div>
  );
};

export default QnDocList;
