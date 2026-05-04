import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Label, Line, Legend } from "recharts";

/**

 * MQIBarLineChart
 * @param {Object[]} data - Array of objects with MQI, count, and percentage
 * @param {string} xAxisKey - The key to use for the x-axis ("MQI" or "Reviewer Feedback" or "month")
 * @param {boolean} isTrendAnalysis - Whether this is trend analysis (for month-year formatting)
 */
const MQIBarLineChart = ({ 
  data, 
  selectedPartNumber, 
  xAxisKey = "MQI", 
  onBarClick, 
  drilldownLabel, 
  onDrilldownBack,
  isTrendAnalysis = false 
}) => {
    // Convert percentage string to number for plotting
        const processedData = data.map(item => ({
            ...item,
            MQI: item.MQI !== undefined && item.MQI !== null ? String(item.MQI) : item.MQI,
            percentageNum: parseFloat(item.cumulative_percentage || item.percentage),
            // For trend analysis, format month to include year if available
            displayKey: isTrendAnalysis && xAxisKey === "month" && item.month ? 
              formatMonthYear(item.month, item.year) : 
              (item[xAxisKey] !== undefined && item[xAxisKey] !== null ? String(item[xAxisKey]) : item[xAxisKey])
        }));

        // Helper function to format month-year for trend analysis
        function formatMonthYear(month, year) {
          if (!month) return month;
          
          // If year is provided, use it
          if (year) {
            return `${month} ${year}`;
          }
          
          // If month contains year info already (like "Jan 2024" or "2024-01"), return formatted
          if (typeof month === 'string') {
            // Handle formats like "2024-01", "2024-1", "01-2024"
            const dateFormats = [
              /^(\d{4})-(\d{1,2})$/, // 2024-01
              /^(\d{1,2})-(\d{4})$/  // 01-2024
            ];
            
            for (let format of dateFormats) {
              const match = month.match(format);
              if (match) {
                const [_, first, second] = match;
                const yearVal = first.length === 4 ? first : second;
                const monthVal = first.length === 4 ? second : first;
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthName = monthNames[parseInt(monthVal) - 1] || monthVal;
                return `${monthName} ${yearVal}`;
              }
            }
            
            // If it already contains a 4-digit year, return as is
            if (/\d{4}/.test(month)) {
              return month;
            }
          }
          
          // If it's just month name, return as is (backend should provide year)
          return month;
        }

        // Custom tooltip to show part number and short_text
        const CustomTooltip = ({ active, payload, label }) => {
            if (active && payload && payload.length) {
                const partNumber = selectedPartNumber.join(',');
                const shortText = payload[0].payload.short_text;
                return (
                    <div style={{ background: '#fff', border: '1px solid #ccc', padding: 10, borderRadius: 4, maxWidth: 320 }}>
                        <div><b>{xAxisKey}:</b> {label}</div>
                        <div><b>Part Number:</b> {partNumber}</div>
                        <div><b>Count:</b> {payload[0].payload.count}</div>
                        <div><b>Percentage:</b> {payload[0].payload.percentageNum}%</div>
                        {shortText && (
                            <div style={{ marginTop: 6 }}>
                                <b>Short Text:</b>
                                <div style={{ color: '#444', fontSize: 13, marginTop: 2, whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{shortText}</div>
                            </div>
                        )}
                    </div>
                );
            }
            return null;
        };

        // Bar click handler
        const handleBarClick = (data, index) => {
            if (onBarClick) {
                onBarClick(data);
            }
        };

        return (
            <div style={{ padding: "8px" }}>
                {drilldownLabel && (
                    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {onDrilldownBack && (
                            <button
                                onClick={onDrilldownBack}
                                style={{
                                    border: 'none',
                                    background: '#f0f0f0',
                                    cursor: 'pointer',
                                    fontSize: 18,
                                    padding: 0,
                                    marginRight: 4,
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background 0.2s, box-shadow 0.2s',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = '#e6f4ff'}
                                onMouseOut={e => e.currentTarget.style.background = '#f0f0f0'}
                                onMouseDown={e => e.currentTarget.style.background = '#bae7ff'}
                                onMouseUp={e => e.currentTarget.style.background = '#e6f4ff'}
                                aria-label="Back"
                                title="Back"
                            >
                                <span style={{ fontWeight: 700, color: '#1890ff', fontSize: 20 }}>←</span>
                            </button>
                        )}
                        <span>{drilldownLabel}</span>
                    </div>
                )}
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey={isTrendAnalysis ? "displayKey" : xAxisKey}
                            interval={0} // Show all x-axis values
                            minTickGap={0}
                            tick={
                                ({ x, y, payload, width }) => {
                                    // Reduce font size and wrap text if too long
                                    const value = payload.value;
                                    const maxLen = isTrendAnalysis ? 8 : 10; // Shorter for trend analysis with year
                                    let lines = [];
                                    if (typeof value === 'string' && value.length > maxLen) {
                                        // For trend analysis, split on space first (to separate month and year)
                                        if (isTrendAnalysis && value.includes(' ')) {
                                            const parts = value.split(' ');
                                            if (parts.length === 2) {
                                                lines = parts; // [Month, Year]
                                            } else {
                                                // Fallback to character wrapping
                                                for (let i = 0; i < value.length; i += maxLen) {
                                                    lines.push(value.slice(i, i + maxLen));
                                                }
                                            }
                                        } else {
                                            // Regular character wrapping for non-trend analysis
                                            for (let i = 0; i < value.length; i += maxLen) {
                                                lines.push(value.slice(i, i + maxLen));
                                            }
                                        }
                                    } else {
                                        lines = [value];
                                    }
                                    return (
                                        <g transform={`translate(${x},${y + 8})`}>
                                            {lines.map((line, idx) => (
                                                <text
                                                    key={idx}
                                                    x={0}
                                                    y={idx * 12}
                                                    textAnchor="middle"
                                                    fontSize={isTrendAnalysis ? 9 : 10}
                                                    fill="#666"
                                                    style={{ whiteSpace: 'pre' }}
                                                >
                                                    {line}
                                                </text>
                                            ))}
                                        </g>
                                    );
                                }
                            }
                        >
                            <Label value={xAxisKey} offset={-30} position="insideBottom" />
                        </XAxis>
                        <YAxis yAxisId="left" allowDecimals={false}>
                            <Label value="Count" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
                        </YAxis>
                        <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`}>
                            <Label value="Percentage" angle={-90} position="insideRight" style={{ textAnchor: 'middle' }} />
                        </YAxis>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="top" height={36} />
                        <Bar
                            yAxisId="left"
                            dataKey="count"
                            fill="#1890ff"
                            name="Count"
                            onClick={handleBarClick}
                            cursor={onBarClick ? "pointer" : undefined}
                        />
                        <Line yAxisId="right" type="monotone" dataKey="percentageNum" stroke="#faad14" name="Percentage" dot />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
};

export default MQIBarLineChart;
