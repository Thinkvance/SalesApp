import { LineChart } from "@mui/x-charts";
import React from "react";
import PieArcLabel from "./PieArcLabel";

const fullSalesData = [
  { month: "Jan", sales: 5000 },
  { month: "Feb", sales: 7000 },
  { month: "Mar", sales: 8000 },
  { month: "Apr", sales: 6500 },
  { month: "May", sales: 9000 },
  { month: "Jun", sales: 11000 },
  { month: "Jul", sales: 12000 },
  { month: "Aug", sales: 10000 },
  { month: "Sep", sales: 9500 },
  { month: "Oct", sales: 10500 },
  { month: "Nov", sales: 11500 },
  { month: "Dec", sales: 13000 },
];

// Get the current month index (0-based)
const currentMonthIndex = new Date().getMonth();

// Ensure future months have `null` instead of `0`
const processedSalesData = fullSalesData.map((data, index) => ({
  month: data.month,
  sales: index <= currentMonthIndex ? data.sales : null, // Hide future values
}));

function LineChartCom() {
  return (
    <div className="bg-gradient-to-r shadow-lg rounded-lg w-5/12">
      <LineChart
        dataset={fullSalesData}
        xAxis={[{ scaleType: "band", dataKey: "month", label: "Months" }]}
        series={[
          {
            dataKey: "sales",
            label: "Sales (in Rs)",
            color: "#8A2BE2",
            showMark: true,
            curve: "monotone",
          },
        ]}
        height={350}
        margin={{ left: 60, right: 30, top: 30, bottom: 50 }}
        grid={{ vertical: false, horizontal: true }}
        tooltip
      />
      <PieArcLabel />
    </div>
  );
}

export default LineChartCom;
