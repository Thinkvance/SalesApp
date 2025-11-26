import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function SalesReportBarChartVendor({ pickups = [] }) {
  // ⛔ If no pickups are passed, show empty state
  if (!Array.isArray(pickups) || pickups.length === 0) {
    return (
      <div
        style={{
          maxWidth: 980,
          margin: "auto",
          padding: 24,
          background: "linear-gradient(to bottom, #f9f7ff, #ffffff)",
          borderRadius: 16,
          boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
        }}
      >
        <h2 className="text-2xl font-semibold text-center text-[#4c1d95] mb-6 tracking-wide">
          📊 Sales Report by Vendor
        </h2>
        <div className="w-full h-[260px] flex items-center justify-center text-gray-500 font-medium text-base">
          No data to display.
        </div>
      </div>
    );
  }

  // ✅ Group data by vendor
  const grouped = pickups.reduce((acc, item) => {
    const key = item.vendorName || "Unknown Vendor";
    if (!acc[key]) {
      acc[key] = {
        vendorName: key,
        totalMargin: 0,
        totalWeight: 0,
        salesCount: 0,
      };
    }
    acc[key].totalMargin += Number(item.margin) || 0;
    acc[key].totalWeight += Number(item.weight) || 0;
    acc[key].salesCount += 1;
    return acc;
  }, {});

  const vendors = Object.values(grouped);

  // ✅ Calculate totals for percentages
  const totalWeightAll = vendors.reduce((sum, v) => sum + v.totalWeight, 0);
  const totalMarginAll = vendors.reduce((sum, v) => sum + v.totalMargin, 0);

  // ✅ Format data for chart
  const data = vendors.map((vendor) => ({
    vendorName: vendor.vendorName,
    totalMargin: vendor.totalMargin,
    totalWeight: vendor.totalWeight,
    weightPercentage:
      totalWeightAll > 0 ? (vendor.totalWeight / totalWeightAll) * 100 : 0,
    marginPercentage:
      totalMarginAll > 0 ? (vendor.totalMargin / totalMarginAll) * 100 : 0,
    salesCount: vendor.salesCount,
  }));

  return (
    <div
      style={{
        maxWidth: 980,
        margin: "auto",
        padding: 24,
        background: "linear-gradient(to bottom, #f9f7ff, #ffffff)",
        borderRadius: 16,
        boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
      }}
    >
      <h2 className="text-2xl font-semibold text-center text-[#4c1d95] mb-6 tracking-wide">
        📊 Sales Report by Vendor
      </h2>

      <ResponsiveContainer width="100%" height={340}>
        <BarChart
          data={data}
          margin={{ top: 25, right: 30, left: 20, bottom: 30 }}
          barGap={10}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.4} />
          <XAxis
            dataKey="vendorName"
            tick={{ fill: "#5b21b6", fontSize: 12 }}
            angle={-15}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tick={{ fill: "#4c1d95", fontSize: 12 }}
            label={{
              value: "Percentage / Count",
              angle: -90,
              position: "insideLeft",
              fill: "#4c1d95",
              fontSize: 12,
            }}
          />

          <Tooltip
            formatter={(value, name, { payload }) => {
              if (!payload) return [value, name];

              const margin = payload.totalMargin || 0;
              const weight = payload.totalWeight || 0;
              const sales = payload.salesCount || 0;

              switch (name) {
                case "weightPercentage":
                  return [
                    `${value.toFixed(1)}% (${weight.toLocaleString()} kg)`,
                    "Weight % (Total Weight)",
                  ];
                case "marginPercentage":
                  return [
                    `${value.toFixed(1)}% (₹${margin.toLocaleString()})`,
                    "Margin % (Total Margin)",
                  ];
                case "salesCount":
                  return [`${sales} Shipments`, "Sales Count"];
                default:
                  return [value, name];
              }
            }}
            labelFormatter={(label) => `Vendor: ${label}`}
            contentStyle={{
              fontSize: 14,
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
            }}
            itemStyle={{ color: "#4c1d95", fontWeight: 500 }}
          />

          <Legend
            verticalAlign="top"
            align="center"
            wrapperStyle={{ fontSize: 13 }}
          />

          {/* 🟩 Weight Percentage Bar */}
          <Bar
            dataKey="weightPercentage"
            fill="#10b981"
            barSize={25}
            name="Weight %"
            radius={[8, 8, 0, 0]}
          >
            <LabelList
              dataKey="weightPercentage"
              position="top"
              formatter={(val) => `${val.toFixed(1)}%`}
              style={{ fill: "#064e3b", fontWeight: "bold", fontSize: 11 }}
            />
          </Bar>

          {/* 🟣 Margin Percentage Bar */}
          <Bar
            dataKey="marginPercentage"
            fill="#7c3aed"
            barSize={25}
            name="Margin %"
            radius={[8, 8, 0, 0]}
          >
            <LabelList
              dataKey="marginPercentage"
              position="top"
              formatter={(val) => `${val.toFixed(1)}%`}
              style={{ fill: "#4c1d95", fontWeight: "bold", fontSize: 11 }}
            />
          </Bar>

          {/* 💜 Sales Count Bar */}
          <Bar
            dataKey="salesCount"
            fill="#a78bfa"
            barSize={25}
            name="Sales Count"
            radius={[8, 8, 0, 0]}
          >
            <LabelList
              dataKey="salesCount"
              position="top"
              formatter={(val) => `${val}`}
              style={{ fill: "#4c1d95", fontWeight: "bold", fontSize: 11 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
