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

export default function SalesReportBarChartSource({ pickups }) {
  const grouped = pickups.reduce((acc, item) => {
    const key = item.Source;

    if (!acc[key]) {
      acc[key] = {
        Source: key,
        logisticsCost: 0,
        salesCount: 0,
      };
    }

    acc[key].logisticsCost += item.logisticCost || 0;
    acc[key].salesCount += 1;

    return acc;
  }, {});

  const data = Object.values(grouped);

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "auto",
        padding: 20,
        background: "#f9f7ff",
        borderRadius: 12,
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      }}
    >
      <h2 className="text-xl font-semibold text-center text-[#4c1d95] mb-4">
        Sales Report by Source
      </h2>

      {data.length === 0 ? (
        <div className="w-full h-[240px] flex items-center justify-center text-gray-500 font-medium text-sm">
          No data to display!
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={data}
            margin={{ top: 20, left: 10, bottom: 20 }}
            barGap={10}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="Source"
              tick={{ fill: "#5b21b6", fontSize: 12 }}
              angle={-15}
              textAnchor="end"
              interval={0}
            />
            {/* Left Y Axis for Logistics Cost */}
            <YAxis
              yAxisId="left"
              tick={{ fill: "#4c1d95", fontSize: 12 }}
              label={{
                // value: "Logistics ₹",
                angle: -90,
                position: "insideLeft",
                fill: "#4c1d95",
                fontSize: 12,
              }}
            />
            {/* Right Y Axis for Sales Count */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: "#a78bfa", fontSize: 12 }}
              label={{
                angle: 90,
                position: "insideRight",
                fill: "#a78bfa",
                fontSize: 12,
              }}
            />
            <Tooltip
              formatter={(value, name) =>
                name === "logisticsCost"
                  ? [`₹${value.toLocaleString()}`, "Logistics Cost"]
                  : [value, "Sales Count"]
              }
              contentStyle={{ fontSize: 15 }}
            />
            <Bar
              yAxisId="left"
              dataKey="logisticsCost"
              fill="#7c3aed"
              barSize={25}
              name="Logistics Cost"
              radius={[6, 6, 0, 0]}
            >
              <LabelList
                dataKey="logisticsCost"
                position="top"
                formatter={(val) => `₹${val.toLocaleString()}`}
                style={{
                  fill: "#4c1d95",
                  fontWeight: "bold",
                  fontSize: 12,
                }}
              />
            </Bar>
            <Bar
              yAxisId="right"
              dataKey="salesCount"
              fill="#a78bfa"
              barSize={20}
              name="Sales Count"
              radius={[6, 6, 0, 0]}
            >
              <LabelList
                dataKey="salesCount"
                position="top"
                formatter={(val) => `${val}`}
                style={{
                  fill: "#5b21b6",
                  fontWeight: "bold",
                  fontSize: 13,
                  textShadow: "0 0 2px white",
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
