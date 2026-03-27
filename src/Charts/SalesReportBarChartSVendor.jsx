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
  if (!Array.isArray(pickups) || pickups.length === 0) {
    return (
      <div className="max-w-5xl mx-auto p-6 bg-gradient-to-b from-purple-50 to-white rounded-xl shadow">
        <h2 className="text-2xl font-semibold text-center text-purple-900 mb-6">
          📊 Sales Report by Vendor
        </h2>
        <div className="h-[260px] flex items-center justify-center text-gray-500">
          No data to display
        </div>
      </div>
    );
  }

  const grouped = pickups.reduce((acc, item) => {
    const key = item.vendorName || "Unknown Vendor";

    if (!acc[key]) {
      acc[key] = {
        vendorName: key,
        totalMargin: 0,
        totalWeight: 0,
        salesCount: 0,
        totalVendorPayment: 0,
        totalLogisticCost: 0,
      };
    }

    acc[key].totalMargin += Number(item.margin) || 0;
    acc[key].totalWeight += Number(item.internalWeight) || 0;
    acc[key].salesCount += 1;

    if (item.vendorpayment) {
      acc[key].totalVendorPayment += Number(item.vendorpayment) || 0;
    }

    acc[key].totalLogisticCost += Number(item.logisticCost) || 0;

    return acc;
  }, {});

  const data = Object.values(grouped);

  const formatNumber = (num) => Number(num).toLocaleString();

  return (
    <div className="max-w-5xl mx-auto p-6 bg-gradient-to-b from-purple-50 to-white rounded-xl shadow">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          margin={{ top: 30, right: 30, left: 20, bottom: 0 }}
          barCategoryGap="30%"
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />

          <XAxis
            dataKey="vendorName"
            tick={{ fill: "#4c1d95", fontSize: 13 }}
          />

          <YAxis tick={{ fill: "#4c1d95", fontSize: 13 }} />

          {/* Tooltip */}
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload;

                const logisticCost = Number(d.totalLogisticCost) || 0;
                const margin = Number(d.totalMargin) || 0;
                const vendorPayment = Number(d.totalVendorPayment) || 0;
                const marginPercent =
                  logisticCost > 0 ? (margin / logisticCost) * 100 : 0;

                return (
                  <div className="bg-white border rounded-lg shadow p-3 text-sm">
                    <div className="font-semibold mb-2">Vendor: {label}</div>
                    <div>Shipment Count: {formatNumber(d.salesCount)}</div>
                    <div>Weight: {formatNumber(d.totalWeight)} kg</div>
                    {logisticCost > 0 && (
                      <div>Selling Price: ₹{formatNumber(logisticCost)}</div>
                    )}
                    <div>Cost Price: ₹{formatNumber(vendorPayment || 0)}</div>
                    <div>Margin: ₹{formatNumber(margin)}</div>
                    {logisticCost > 0 && (
                      <div className="font-semibold text-purple-700">
                        Margin: {marginPercent.toFixed(1)}%
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />

          <Legend wrapperStyle={{ fontSize: 14 }} />

          {/* Weight */}
          <Bar
            dataKey="totalWeight"
            fill="#10b981"
            name="Weight (kg)"
            barSize={28}
            radius={[6, 6, 0, 0]}
            minPointSize={2}
          >
            <LabelList
              dataKey="totalWeight"
              position="top"
              formatter={(v) => formatNumber(v)}
              style={{ fontSize: 11 }}
            />
          </Bar>

          {/* Margin */}
          <Bar
            dataKey="totalMargin"
            fill="#7c3aed"
            name="Margin (₹)"
            barSize={28}
            radius={[6, 6, 0, 0]}
          >
            <LabelList
              dataKey="totalMargin"
              position="top"
              formatter={(v) => formatNumber(v)}
              style={{ fontSize: 11 }}
            />
          </Bar>

          {/* Sales */}
          <Bar
            dataKey="salesCount"
            fill="#f59e0b"
            name="Sales Count"
            barSize={28}
            radius={[6, 6, 0, 0]}
            minPointSize={4}
          >
            <LabelList
              dataKey="salesCount"
              position="top"
              formatter={(v) => formatNumber(v)}
              style={{ fontSize: 11 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
