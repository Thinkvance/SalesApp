import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import LineChartCom from "./Dashboard/LineChartCom";

const LogisticsDashboard = () => {
  const [totalPickups, setTotalPickups] = useState(0);
  const [warehouseCount, setWarehouseCount] = useState(0);
  const [paymentPendingCount, setPaymentPendingCount] = useState(0);
  const [paymentDoneCount, setPaymentDoneCount] = useState(0);
  const [shippedCount, setShippedCount] = useState(0);

  useEffect(() => {
    const fetchPickupData = async () => {
      try {
        const pickupCollection = collection(db, "pickup");
        const snapshot = await getDocs(pickupCollection);
        const documents = snapshot.docs.map((doc) => doc.data());
        setTotalPickups(documents.length);
        setWarehouseCount(
          documents.filter((doc) => doc.status === "INCOMING MANIFEST").length
        );
        setPaymentPendingCount(
          documents.filter((doc) => doc.status === "PAYMENT PENDING").length
        );
        setPaymentDoneCount(
          documents.filter((doc) => doc.status === "PAYMENT DONE").length
        );
        setShippedCount(
          documents.filter((doc) => doc.status === "SHIPMENT CONNECTED").length
        );
      } catch (error) {
        console.error("Error fetching pickup data:", error);
      }
    };
    fetchPickupData();
  }, []);

  return (
    <div className="dashboard bg-gray-100 min-h-screen p-8">
      <h2 className="text-2xl font-semibold mb-6">Logistics Dashboard</h2>
      <div className="stats grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="stat-card bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Total Pickups</h3>
          <p className="text-3xl font-bold text-purple-600">{totalPickups}</p>
        </div>
        <div className="stat-card bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Warehouse</h3>
          <p className="text-3xl font-bold text-purple-600">{warehouseCount}</p>
        </div>
        <div className="stat-card bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">
            Payment Pending
          </h3>
          <p className="text-3xl font-bold text-yellow-500">
            {paymentPendingCount}
          </p>
        </div>
        <div className="stat-card bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Payment Done</h3>
          <p className="text-3xl font-bold text-green-500">
            {paymentDoneCount}
          </p>
        </div>
        <div className="stat-card bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Shipped</h3>
          <p className="text-3xl font-bold text-blue-500">{shippedCount}</p>
        </div>
      </div>
      <LineChartCom />
    </div>
  );
};

export default LogisticsDashboard;
