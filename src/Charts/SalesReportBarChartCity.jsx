import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ResponsiveContainer,
} from "recharts";

export default function SalesReportBarChartCity({ pickups }) {
  const grouped = pickups.reduce((acc, item) => {
    const key = item.City;

    if (!acc[key]) {
      acc[key] = {
        City: key,
        logisticsCost: 0,
        salesCount: 0,
      };
    }

    acc[key].logisticsCost += item.logisticCost || 0;
    acc[key].salesCount += 1;

    return acc;
  }, {});

  const data = Object.values(grouped);
  console.log("data", data);
  return (
    <div
      style={{
        maxWidth: 700,
        margin: "auto",
        padding: 20,
        background: "#f9f7ff",
        borderRadius: 12,
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      }}
    >
      {data.length === 0 ? (
        <div
          className="w-full h-[240px] flex items-center justify-center text-gray-500 font-medium"
          style={{ fontSize: 16 }}
        >
          No data to display!
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={data}
            barGap={20}
            margin={{ top: 30, right: 20, left: 20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="City"
              tick={{ fill: "#5b21b6", fontWeight: 600, fontSize: 13 }}
              interval={0}
              height={35}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              tick={{ fill: "#7c3aed", fontSize: 12 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: "#a78bfa", fontSize: 12 }}
            />
            <Tooltip
              formatter={(value, name) =>
                name === "logisticsCost"
                  ? [`₹${value}`, "Logistics Cost"]
                  : [value, "Sales Count"]
              }
              contentStyle={{ fontSize: 13 }}
            />

            <Bar
              yAxisId="left"
              dataKey="logisticsCost"
              fill="#7c3aed"
              barSize={24}
              radius={[6, 6, 0, 0]}
            >
              <LabelList
                dataKey="logisticsCost"
                position="top"
                dy={-8}
                formatter={(val) => `₹${val.toLocaleString()}`}
                style={{ fill: "#4c1d95", fontWeight: "bold", fontSize: 11 }}
              />
            </Bar>

            <Bar
              yAxisId="right"
              dataKey="salesCount"
              fill="#a78bfa"
              barSize={24}
              radius={[6, 6, 0, 0]}
            >
              <LabelList
                dataKey="salesCount"
                position="top"
                dy={-8}
                style={{ fill: "#5b21b6", fontWeight: "bold", fontSize: 11 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
