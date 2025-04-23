import { BarChart } from "@mui/x-charts";
import React from "react";

const salesData = [
  { name: "mouli", totalMargin: 10000, color: "#9333ea" }, // Tailwind purple-600
  { name: "jaga", totalMargin: 93000, color: "#9333ea" },
  { name: "Sana", totalMargin: 93000, color: "#9333ea" },
];

function BarChartCom() {
  return (
    <div className="bg-transparent shadow-lg rounded-lg p-4">
      <BarChart
        dataset={salesData}
        xAxis={[
          {
            scaleType: "band",
            dataKey: "name",
            // label: "Sales Representative",
          },
        ]}
        series={[
          {
            dataKey: "totalMargin",
            barWidth: 30,
            showMark: true,
            itemProps: ({ dataIndex }) => ({
              fill: salesData[dataIndex].color,
            }),
          },
        ]}
        height={120} // Increased height for clarity
        margin={{ left: 60, right: 10, top: 20, bottom: 40 }}
        grid={{ vertical: false, horizontal: true }}
        tooltip
      />
    </div>
  );
}

export default BarChartCom;
