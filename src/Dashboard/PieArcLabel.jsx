import * as React from "react";
import { PieChart } from "@mui/x-charts/PieChart";

export default function PieArcLabel() {
  const data = [
    { id: 0, value: 40, label: "Total Shipments" },
    { id: 1, value: 40, label: "Payment Done" },
    { id: 2, value: 20, label: "Payment Pending" },
    { id: 3, value: 1, label: "Shipment Connected" }, // No value for this category
  ];

  return (
    <PieChart
      series={[
        {
          data,
          highlightScope: { fade: "global", highlight: "item" },
          faded: { innerRadius: 30, additionalRadius: -30, color: "gray" },
          valueFormatter: (value) => `${value.value}%`, // Corrected value display
        },
      ]}
      height={250} // Slightly increased height for better spacing
    />
  );
}
