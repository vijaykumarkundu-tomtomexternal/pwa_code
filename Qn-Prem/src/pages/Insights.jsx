
import React from "react";
import dayjs from "dayjs";
import AppHeader from "../components/layouts/AppHeader/AppHeader";
import { Typography, Select, DatePicker, Button } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import ExcelExporter from "../components/ExcelExporter";
import MQIBarLineChart from "../features/Insights/MQIBarLineChart";
import useQNInsights from "@/hooks/useQNInsights";
import useMQITrendAnalysis from "@/hooks/useMQITrendAnalysis";

const { Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

// Trend analysis chart for MQI
const TrendBarChart = ({ data, mqi, dateRange, onDateRangeChange, onClose }) => {
  const formatDateRange = () => {
    if (dateRange && dateRange.start && dateRange.end) {
      return `${dateRange.start.format('MMM YYYY')} - ${dateRange.end.format('MMM YYYY')}`;
    }
    return 'Date Range';
  };

  return (
    <div style={{ marginTop: 32, background: '#f9f9f9', borderRadius: 8, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: 4 }}>
            Trend Analysis for MQI: {mqi}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {formatDateRange()}
          </div>
        </div>
        <Button size="small" onClick={onClose}>Close</Button>
      </div>
      
      {/* Date Range Picker */}
      <div style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: '12px', color: '#666', marginRight: 8 }}>Select Date Range:</Text>
        <RangePicker
          value={[dateRange?.start, dateRange?.end]}
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
              onDateRangeChange({ start: dates[0], end: dates[1] });
            }
          }}
          format="MMM YYYY"
          picker="month"
          size="small"
          style={{ width: 250 }}
          placeholder={['Start Month', 'End Month']}
        />
      </div>

      {(!data || data.length === 0) ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px',
          color: '#666',
          fontSize: '14px',
          background: '#fff',
          borderRadius: 4,
          border: '1px solid #e8e8e8'
        }}>
          <div style={{ marginBottom: 8, fontSize: '16px' }}>📊</div>
          <div>No trend data available for MQI: <strong>{mqi}</strong></div>
          <div style={{ marginTop: 4, fontSize: '12px', color: '#999' }}>
            This MQI may not have enough data for the selected date range.
          </div>
        </div>
      ) : (
        <MQIBarLineChart
          data={data}
          xAxisKey="month"
          selectedPartNumber={[]}
          isTrendAnalysis={true}
          key={`${mqi}-${dateRange?.start?.valueOf()}-${dateRange?.end?.valueOf()}`}
        />
      )}
    </div>
  );
};


const Insights = () => {
  const [selectedPart, setSelectedPart] = React.useState("All");
  const [dateRange, setDateRange] = React.useState([null, null]);

  const [dataType, setDataType] = React.useState("mqi"); // "mqi" or "reviewer_feedback"
  const [drilldown, setDrilldown] = React.useState(null); // { reviewerFeedback: string } | null

  // State for selected MQI for trend analysis
  const [selectedTrendMQI, setSelectedTrendMQI] = React.useState(null);
  // State for trend analysis date range - default to last 6 months
  const [trendDateRange, setTrendDateRange] = React.useState(() => {
    const endDate = dayjs();
    const startDate = dayjs().subtract(6, 'months');
    return { start: startDate, end: endDate };
  });
  
  const { data: trendData, loading: trendLoading, error: trendError } = useMQITrendAnalysis(selectedTrendMQI, trendDateRange);

  // Convert dateRange and selectedPart to API params (partNumber only sent if not 'All')
  const apiParams = React.useMemo(() => {
    const params = {};
    // Defensive: ensure dateRange is an array and both elements are valid
    if (
      Array.isArray(dateRange) &&
      dateRange.length === 2 &&
      dateRange[0] && typeof dateRange[0].format === 'function' &&
      dateRange[1] && typeof dateRange[1].format === 'function'
    ) {
      params.startDate = dateRange[0].format("YYYY-MM-DD");
      params.endDate = dateRange[1].format("YYYY-MM-DD");
    }
    // Only send partNumber if not 'All' and not empty
    if (selectedPart && selectedPart !== "All") {
      params.partNumber = selectedPart;
    }
    return params;
  }, [dateRange, selectedPart]);

  const { loading, data, error } = useQNInsights("/mqi_counts_by_part", apiParams);

  // Get unique part numbers from selected data type, add 'All' option
  // Use part_numbers from API response for dropdown
  const partNumbers = React.useMemo(() => {
    if (!data || !Array.isArray(data.part_numbers)) return [];
    return data.part_numbers.length > 0 ? ["All", ...data.part_numbers] : [];
  }, [data]);

  // No local filtering by part number; just use data from API
  let filteredData = React.useMemo(() => {
    if (!data || !data[dataType]) return [];
    // Normalize null/undefined for MQI, Reviewer Feedback, Vendor
    return data[dataType].map(item => {
      const newItem = { ...item };

      if (newItem.MQI === null || newItem.MQI === undefined) newItem.MQI = 'null';
      if (newItem['Reviewer Feedback'] === null || newItem['Reviewer Feedback'] === undefined) newItem['Reviewer Feedback'] = 'null';
      if (newItem['Vendor'] === null || newItem['Vendor'] === undefined) newItem['Vendor'] = 'null';
      // Also normalize in mqi_breakdown if present (for drilldown)
      if (Array.isArray(newItem.mqi_breakdown)) {
        newItem.mqi_breakdown = newItem.mqi_breakdown.map(b => {
          const b2 = { ...b };
          if (b2.MQI === null || b2.MQI === undefined) b2.MQI = 'null';
          if (b2['Reviewer Feedback'] === null || b2['Reviewer Feedback'] === undefined) b2['Reviewer Feedback'] = 'null';
          if (b2['Vendor'] === null || b2['Vendor'] === undefined) b2['Vendor'] = 'null';
          return b2;
        });
      }
      return newItem;
    });
  }, [data, dataType]);

  // Drilldown: if in reviewer_feedback or vendor and drilldown is set, show MQI occurrences for that reviewer feedback/vendor using mqi_breakdown
  if ((dataType === "reviewer_feedback" || dataType === "vendor") && drilldown && data && data[dataType]) {
    console.log('Drilldown logic - dataType:', dataType, 'drilldown:', drilldown, 'data[dataType]:', data[dataType]);
    const key = dataType === "reviewer_feedback" ? "Reviewer Feedback" : "Vendor";
    // Get the original drilldown value - convert 'null' string back to actual null for search
    const originalDrillVal = drilldown.reviewerFeedback === 'null' ? null : drilldown.reviewerFeedback;
    console.log('Looking for key:', key, 'with value:', originalDrillVal);

    // Use original raw data to find the correct vendor/reviewer
    const selected = data[dataType].find(d => {
      console.log('Checking item:', d[key], 'against:', originalDrillVal);
      return d[key] === originalDrillVal;
    });

    console.log('Selected item:', selected);
    filteredData = selected && selected.mqi_breakdown ? selected.mqi_breakdown.map(b => {
      const b2 = { ...b };
      if (b2.MQI === null || b2.MQI === undefined) b2.MQI = 'null';
      if (b2['Reviewer Feedback'] === null || b2['Reviewer Feedback'] === undefined) b2['Reviewer Feedback'] = 'null';
      if (b2['Vendor'] === null || b2['Vendor'] === undefined) b2['Vendor'] = 'null';
      return b2;
    }) : [];
    console.log('Final filteredData after drilldown:', filteredData);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fa" }}>
      <AppHeader />
      <main style={{ width: "100%", margin: 0, padding: "24px" }}>
        <section style={{ marginBottom: 32, padding: "16px" }}>
          <Text style={{ fontSize: 28, fontWeight: 700 }}>Business Insights</Text>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            Explore analytics and insights for your business operations.
          </Paragraph>
        </section>
        <section style={{ background: "#fff", borderRadius: 8, padding: "16px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", width: "100%", maxWidth: "none" }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <label htmlFor="data-type-select" style={{ fontSize: 13, marginBottom: 2 }}>Data Type</label>
              <Select
                id="data-type-select"
                style={{ minWidth: 180 }}
                value={dataType}
                onChange={value => {
                  setDataType(value);
                  setSelectedPart("All");
                  setDateRange([null, null]);
                  setDrilldown(null); // Reset drilldown when changing data type
                  setSelectedTrendMQI(null); // Close trend chart when changing data type
                }}
                options={[
                  { label: "MQI", value: "mqi" },
                  { label: "Reviewer Feedback", value: "reviewer_feedback" },
                  { label: "Vendor", value: "vendor" }
                ]}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="part-number-select" style={{ fontSize: 13, marginBottom: 2 }}>Part Number</label>
                <Select
                  id="part-number-select"
                  allowClear
                  placeholder="Drill down by Part Number"
                  style={{ minWidth: 220 }}
                  value={selectedPart}
                  onChange={setSelectedPart}
                  options={partNumbers.map(pn => ({ label: pn === "All" ? "All (Total)" : pn, value: pn }))}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="date-range-picker" style={{ fontSize: 13, marginBottom: 2 }}>Date Range</label>
                <DatePicker.RangePicker
                  id="date-range-picker"
                  style={{ minWidth: 260 }}
                  value={dateRange}
                  onChange={setDateRange}
                  allowEmpty={[true, true]}
                  format="YYYY-MM-DD"
                  placeholder={["Start date", "End date"]}
                  disabledDate={current => current && current > dayjs().endOf('day')}
                />
              </div>
            </div>
          </div>
          {loading && <p>Loading...</p>}
          {!loading && error && <p>Error: {error}</p>}
          {!loading && !error && filteredData && filteredData.length > 0 && (
            <React.Fragment>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 16, minHeight: 400 }}>
                <div style={{ flex: '0 0 65%', minWidth: 0, minHeight: 400, display: 'flex', alignItems: 'stretch' }}>
                  <div style={{ width: '100%', minWidth: 0, display: 'flex', alignItems: 'stretch' }}>
                    <div style={{ width: '100%', minWidth: 400 }}>
                      <MQIBarLineChart
                        data={filteredData}
                        selectedPartNumber={selectedPart === 'All' ? data.part_numbers : [selectedPart]}
                        xAxisKey={
                          dataType === "mqi" || drilldown ? "MQI" :
                            dataType === "reviewer_feedback" ? "Reviewer Feedback" :
                              dataType === "vendor" ? "Vendor" : ""
                        }
                        onBarClick={
                          (dataType === "reviewer_feedback" || dataType === "vendor") && !drilldown
                            ? (bar) => {
                              console.log('Setting drilldown with bar:', bar, 'dataType:', dataType);
                              const drilldownValue = dataType === "reviewer_feedback" ? bar["Reviewer Feedback"] : bar["Vendor"];
                              console.log('Drilldown value:', drilldownValue);
                              setDrilldown({ reviewerFeedback: drilldownValue });
                            }
                            : ((dataType === "mqi" && !drilldown) || (dataType === "reviewer_feedback" && drilldown) || (dataType === "vendor" && drilldown))
                              ? (bar) => {
                                // For both main MQI and drilldown, use bar.MQI for trend
                                console.log('Bar clicked:', bar);
                                if (bar && bar.MQI !== undefined && bar.MQI !== null && bar.MQI !== "") {
                                  setSelectedTrendMQI(bar.MQI);
                                } else {
                                  alert("No MQI value found for this bar. Trend analysis cannot be loaded.");
                                }
                              }
                              : undefined
                        }
                        drilldownLabel={
                          drilldown
                            ? (
                              dataType === "vendor"
                                ? `Vendor: ${drilldown.reviewerFeedback === 'null' ? 'N/A' : drilldown.reviewerFeedback}`
                                : `Reviewer Feedback: ${drilldown.reviewerFeedback === 'null' ? 'N/A' : drilldown.reviewerFeedback}`
                            )
                            : null
                        }
                        onDrilldownBack={drilldown ? () => setDrilldown(null) : undefined}
                      />
                    </div>
                  </div>
                </div>
                {/* Table for MQI or drilldown of vendor/reviewer_feedback */}
                <div style={{ flex: '0 0 35%', minWidth: 320, maxWidth: '100%', padding: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.03)', minHeight: 400, maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                  {((dataType === "mqi" && !drilldown) || ((dataType === "vendor" || dataType === "reviewer_feedback") && drilldown)) ? (
                    <React.Fragment>
                      <div style={{
                        fontWeight: 600,
                        fontSize: 16,
                        marginBottom: 0,
                        background: '#fafcff',
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                        paddingBottom: 8,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingRight: 8
                      }}>
                        <span>MQI Details</span>
                        <ExcelExporter 
                          data={filteredData}
                          filename={`MQI_Details${drilldown ? `_${dataType === 'vendor' ? 'Vendor' : 'ReviewerFeedback'}` : ''}`}
                          buttonText="Export"
                        />
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: '#f0f5ff', position: 'sticky', top: 32, zIndex: 1 }}>
                            <th style={{ padding: '6px 8px', border: '1px solid #e6f7ff', position: 'sticky', top: 32, background: '#f0f5ff', zIndex: 2 }}>S.No</th>
                            <th style={{ padding: '6px 8px', border: '1px solid #e6f7ff', position: 'sticky', top: 32, background: '#f0f5ff', zIndex: 2 }}>MQI</th>
                            <th style={{ padding: '6px 8px', border: '1px solid #e6f7ff', position: 'sticky', top: 32, background: '#f0f5ff', zIndex: 2 }}>Occurrences</th>
                            <th style={{ padding: '6px 8px', border: '1px solid #e6f7ff', position: 'sticky', top: 32, background: '#f0f5ff', zIndex: 2 }}>Defect Code</th>
                            <th style={{ padding: '6px 8px', border: '1px solid #e6f7ff', position: 'sticky', top: 32, background: '#f0f5ff', zIndex: 2 }}>Short Text</th>
                            <th style={{ padding: '6px 8px', border: '1px solid #e6f7ff', position: 'sticky', top: 32, background: '#f0f5ff', zIndex: 2 }}>Root Causes</th>
                            <th style={{ padding: '6px 8px', border: '1px solid #e6f7ff', position: 'sticky', top: 32, background: '#f0f5ff', zIndex: 2 }}>Corrective Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredData.map((row, idx) => (
                            <tr key={row.MQI || idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f6faff' }}>
                              <td style={{ padding: '6px 8px', border: '1px solid #e6f7ff', textAlign: 'center' }}>{idx + 1}</td>
                              <td style={{ padding: '6px 8px', border: '1px solid #e6f7ff' }}>{row.MQI}</td>
                              <td style={{ padding: '6px 8px', border: '1px solid #e6f7ff', textAlign: 'center' }}>{row.count}</td>
                              <td style={{ padding: '6px 8px', border: '1px solid #e6f7ff' }}>{row.defect_code || '-'}</td>
                              <td style={{ padding: '6px 8px', border: '1px solid #e6f7ff', maxWidth: 120, whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{row.short_text || '-'}</td>
                              <td style={{ padding: '6px 8px', border: '1px solid #e6f7ff', maxWidth: 120, whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{row.root_causes || '-'}</td>
                              <td style={{ padding: '6px 8px', border: '1px solid #e6f7ff', maxWidth: 120, whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{row.corrective_action || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </React.Fragment>
                  ) : (
                    <></>
                  )}
                </div>
              </div>
              {(!drilldown && (dataType === "mqi" || dataType === "reviewer_feedback")) && (
                <div style={{ marginTop: 8, color: '#888', fontSize: 12 }}>
                  Note: Only the top 10 categories are displayed in both MQI and Reviewer Feedback views (not in drilldown).
                </div>
              )}
              {/* Trend analysis chart for MQI */}
              {selectedTrendMQI && ((dataType === "mqi" && !drilldown) || ((dataType === "reviewer_feedback" || dataType === "vendor") && drilldown)) && (
                <div>
                  {trendLoading && <p>Loading trend analysis...</p>}
                  {trendError && <p style={{ color: 'red' }}>{trendError}</p>}
                  {!trendLoading && !trendError && (
                    <TrendBarChart 
                      data={trendData} 
                      mqi={selectedTrendMQI} 
                      dateRange={trendDateRange}
                      onDateRangeChange={setTrendDateRange}
                      onClose={() => setSelectedTrendMQI(null)} 
                    />
                  )}
                </div>
              )}

            </React.Fragment>
          )}
        </section>
      </main>
    </div>
  );
};

export default Insights;
