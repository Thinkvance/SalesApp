import { BarChart } from "@mui/x-charts";
import React from "react";

function BarChartCom({ salesData }) {
  return (
    <div className="bg-transparent shadow-lg rounded-lg ">
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
        margin={{ top: 20, bottom: 40 }}
        grid={{ vertical: false, horizontal: true }}
        tooltip
      />
    </div>
  );
}

export default BarChartCom;
