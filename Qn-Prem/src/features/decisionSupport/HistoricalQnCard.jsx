import styles from "./DecisionSupport.module.css";
import { assets } from "../../assets";
import { Button, Radio } from "antd";

const HistoricalQnCard = ({item, handleCompareClick, handleViewPdf, isSelected, onSelectionChange }) => (
    <div className={styles.historyQnCard}>
      <div className={styles.historyQnCardHeader}>
        <div className="flex items-center justify-between" style={{flexDirection: 'row'}}>
          <div className="flex items-center gap-2">
            <Radio 
              checked={isSelected}
              onChange={(e) => {
                // Allow both check and uncheck behavior
                if (isSelected) {
                  // If already selected, uncheck it
                  onSelectionChange && onSelectionChange(item._id, false);
                } else {
                  // If not selected, check it
                  onSelectionChange && onSelectionChange(item._id, true);
                }
              }}
              onClick={(e) => {
                // Handle click to allow unchecking
                if (isSelected) {
                  e.preventDefault();
                  onSelectionChange && onSelectionChange(item._id, false);
                }
              }}
            />
            <span>QN Number: {item['QN']}</span>
          </div>
          <div className="flex items-center gap-1">
            {/* Design Icon */}
            {item.design && (
              <img
                src={assets.design}
                alt="View Design"
                title={`Design: ${item.design.filename}`}
                style={{ 
                  width: 20, 
                  height: 20, 
                  cursor: 'pointer',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
                }}
                onClick={() => handleViewPdf && handleViewPdf({
                  filepath: item.design.filepath,
                  filename: item.design.filename,
                  filetype: item.design.filetype,
                  source: 'Design'
                })}
              />
            )}
            {/* Structure Icon */}
            {item.structure && (
              <img
                src={assets.structure}
                alt="View Structure"
                title={`Structure: ${item.structure.filename}`}
                style={{ 
                  width: 20, 
                  height: 20, 
                  cursor: 'pointer',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
                }}
                onClick={() => handleViewPdf && handleViewPdf({
                  filepath: item.structure.filepath,
                  filename: item.structure.filename,
                  filetype: item.structure.filetype,
                  source: 'Structure'
                })}
              />
            )}
          </div>
        </div>
      </div>
      <div className={styles.historyQnCardBody}>
        <div className="flex justify-between">
          <div>
            <p>Issue Date</p>
            <p className="font-semibold">{item["Issue Date"]}</p>
          </div>
          <div>
            <p>MQI Number</p>
            <p className="font-semibold">{item.MQI}</p>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <p>Long Text</p>
          <p className="font-semibold">
            {item["Long Text"]}
          </p>
        </div>
      </div>
      <div className={styles.historyQnCardFooter}>
        <div className="flex justify-between items-center">
          <div className="success-text">Match : {item.Percentage_Closeness}%</div>
          <Button
            color="primary"
            size="small"
            shape="round"
            variant="outlined"
            icon={<img className="img-12" src={assets.compare} alt="Compare" />}
            onClick={() => handleCompareClick(item)}
          >
            Compare
          </Button>
        </div>
      </div>
    </div>
  );
  export default HistoricalQnCard;