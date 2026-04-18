import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

function DiscountSummaryCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const credsRaw = localStorage.getItem("LoginCredentials");
    if (!credsRaw) {
      setLoading(false);
      return;
    }
    const agentName = JSON.parse(credsRaw).name;
    if (!agentName) {
      setLoading(false);
      return;
    }

    const ref = doc(db, "sales_executive_discounts", agentName);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setData(snap.exists() ? snap.data() : null);
        setLoading(false);
      },
      () => setLoading(false),
    );

    return () => unsubscribe();
  }, []);

  if (loading || !data) return null;

  const netDiscount = data.netDiscount || 0;
  const totalShipments = data.totalShipments || 0;
  const totalDiscountsGiven = data.totalDiscountsGiven || 0;
  const totalRecovered = data.totalRecovered || 0;

  // Positive net = agent gave more discount than recovered (bad for margin)
  // Negative net = agent recovered more than discounted (good, extra margin)
  const isInDeficit = netDiscount > 0;
  const isInProfit = netDiscount < 0;

  const headline = isInDeficit
    ? "You're giving more discount than recovering"
    : isInProfit
      ? "Great! You're earning extra margin"
      : "You're breaking even";

  const netBg = isInDeficit
    ? "bg-red-50 border-red-200"
    : isInProfit
      ? "bg-green-50 border-green-200"
      : "bg-gray-50 border-gray-200";

  const netTextColor = isInDeficit
    ? "text-red-700"
    : isInProfit
      ? "text-green-700"
      : "text-gray-700";

  const netLabel = isInDeficit
    ? "Net Discount Given"
    : isInProfit
      ? "Net Extra Margin"
      : "Net Balance";

  return (
    <div className="border-t border-gray-200 mt-4 pt-4">
      <h3 className="text-sm font-semibold text-purple-700 uppercase tracking-wide mb-3">
        Your Performance So Far
      </h3>

      <div className={`rounded-lg border p-4 ${netBg}`}>
        {/* Headline */}
        <p className={`text-sm font-medium ${netTextColor} mb-3`}>
          {headline}
        </p>

        {/* Net amount */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">
              {netLabel}
            </p>
            <p className={`text-3xl font-bold ${netTextColor}`}>
              ₹{Math.abs(netDiscount).toLocaleString("en-IN")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">
              Shipments
            </p>
            <p className="text-2xl font-bold text-gray-700">{totalShipments}</p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              Total Discount Given
            </p>
            <p className="text-sm font-semibold text-red-600">
              ₹{totalDiscountsGiven.toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              Total Recovered
            </p>
            <p className="text-sm font-semibold text-green-600">
              ₹{totalRecovered.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* Helper text */}
        <p className="text-xs text-gray-500 mt-3 leading-relaxed">
          Compared to the rate card across all your shipments. Charging above
          the rate card adds to <span className="text-green-600 font-medium">Recovered</span>;
          charging below adds to <span className="text-red-600 font-medium">Discount Given</span>.
        </p>
      </div>
    </div>
  );
}

export default DiscountSummaryCard;
