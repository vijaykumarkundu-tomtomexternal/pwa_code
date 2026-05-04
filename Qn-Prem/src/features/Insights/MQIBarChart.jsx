import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Label } from "recharts";

/**
 * MQIBarChart
 * @param {Object[]} data - Array of objects with MQI and count
 */
const MQIBarChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="MQI">
          <Label value="MQI" offset={-10} position="insideBottom" />
        </XAxis>
        <YAxis>
          <Label value="Count" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
        </YAxis>
        <Tooltip />
        <Bar dataKey="count" fill="#1890ff" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default MQIBarChart;
