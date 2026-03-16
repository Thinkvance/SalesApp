import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts";

export default function BarChartCityWise({ pickups = [] }) {
  if (!Array.isArray(pickups) || pickups.length === 0) {
    return (
      <div className="max-w-5xl mx-auto p-6 bg-gradient-to-b from-purple-50 to-white rounded-xl shadow">
        <h2 className="text-2xl font-semibold text-center text-purple-900 mb-6">
          📊 City Performance
        </h2>
        <div className="h-[260px] flex items-center justify-center text-gray-500">
          No data to display
        </div>
      </div>
    );
  }

  // Group by City
  const grouped = pickups.reduce((acc, item) => {
    const city = item.City || "Unknown";

    if (!acc[city]) {
      acc[city] = {
        city,
        totalWeight: 0,
        totalMargin: 0,
        salesCount: 0,
        totalVendorPayment: 0,
        totalLogisticCost: 0,
      };
    }

    acc[city].totalWeight += Number(item.internalWeight) || 0;
    acc[city].totalMargin += Number(item.margin) || 0;
    acc[city].salesCount += 1;

    if (item.vendorPayment) {
      acc[city].totalVendorPayment += Number(item.vendorPayment) || 0;
    }

    acc[city].totalLogisticCost += Number(item.logisticCost) || 0;

    return acc;
  }, {});

  const data = Object.values(grouped);

  const formatNumber = (n) => Number(n).toLocaleString();

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gradient-to-b from-purple-50 to-white rounded-xl shadow">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
          barCategoryGap="25%"
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />

          <XAxis dataKey="city" tick={{ fill: "#4c1d95", fontSize: 13 }} />

          <YAxis tick={{ fill: "#4c1d95", fontSize: 13 }} />

          {/* Tooltip with Margin Percentage */}
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload;

                const logisticCost = Number(d.totalLogisticCost) || 0;
                const margin = Number(d.totalMargin) || 0;

                const marginPercent =
                  logisticCost > 0 ? (margin / logisticCost) * 100 : 0;

                return (
                  <div className="bg-white border rounded-lg shadow p-3 text-sm">
                    <div className="font-semibold mb-2">City: {label}</div>

                    <div>Weight: {formatNumber(d.totalWeight)} kg</div>

                    {logisticCost > 0 && (
                      <div>Selling Price: ₹{formatNumber(logisticCost)}</div>
                    )}

                    <div>Shipment Count: {formatNumber(d.salesCount)}</div>

                    {d.totalVendorPayment > 0 && (
                      <div>
                        Cost Price: ₹{formatNumber(d.totalVendorPayment)}
                      </div>
                    )}

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

          <Legend />

          {/* Weight */}
          <Bar
            dataKey="totalWeight"
            fill="#10b981"
            name="Weight (kg)"
            barSize={28}
            radius={[6, 6, 0, 0]}
            minPointSize={4}
          >
            <LabelList
              dataKey="totalWeight"
              position="top"
              formatter={formatNumber}
              style={{ fontSize: 12 }}
            />
          </Bar>

          {/* Margin */}
          <Bar
            dataKey="totalMargin"
            fill="#7c3aed"
            name="Margin (₹)"
            barSize={28}
            radius={[6, 6, 0, 0]}
            minPointSize={4}
          >
            <LabelList
              dataKey="totalMargin"
              position="top"
              formatter={formatNumber}
              style={{ fontSize: 12 }}
            />
          </Bar>

          {/* Sales */}
          <Bar
            dataKey="salesCount"
            fill="#f59e0b"
            name="Sales"
            barSize={28}
            minPointSize={6}
            radius={[6, 6, 0, 0]}
          >
            <LabelList
              dataKey="salesCount"
              position="top"
              formatter={formatNumber}
              style={{ fontSize: 12 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
