import { useState, useEffect } from "react";
import Nav from "./Nav";
import PaymentConfirmCard from "./PaymentConfirmCard";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import collectionName_BaseAwb from "./functions/collectionName";
import utilityFunctions from "./Utility/utilityFunctions";
import oneMonthAgo from "./Utility/oneMonthAgo.js";

function PaymentConfirm() {
  const [data, setData] = useState([]);
  const [activeTab, setActiveTab] = useState("PAYMENT PENDING");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loginCredentials = JSON.parse(
      localStorage.getItem("LoginCredentials")
    );
    if (!loginCredentials) return;

    const { role, Location, name } = loginCredentials;

    const collectionRef = collection(
      db,
      collectionName_BaseAwb.getCollection(Location)
    );

    const baseQuery =
      role === "Manager" || role === "sales admin"
        ? query(collectionRef, orderBy("pickupDatetime", "desc"))
        : query(
            collectionRef,
            where("pickupBookedBy", "==", name),
            where("pickupDatetime", ">=", Timestamp.fromDate(oneMonthAgo)),
            orderBy("pickupDatetime", "desc")
          );

    const unsubscribe = onSnapshot(
      baseQuery,
      (snapshot) => {
        const documents = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setData(documents);
        setLoading(false);
      },
      (error) => {
        utilityFunctions.ErrorNotify(
          "Data retrieval failed. Please try again."
        );
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const allowedStatusesPending = ["PAYMENT PENDING", "PAYMENT REQUESTED"];
  const allowedStatusesDone = [
    "PAYMENT DONE",
    "SHIPMENT CONNECTED",
    "PAYMENT REQUESTED",
  ];

  const filteredData = data.filter(
    (item) =>
      (activeTab === "PAYMENT PENDING"
        ? allowedStatusesPending.includes(item.status)
        : allowedStatusesDone.includes(item.status)) &&
      String(item.awbNumber).includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <Nav />
      <div className="max-w-screen-xl mx-auto p-5">
        <div className="flex justify-center space-x-4 mt-5">
          <button
            className={`py-2 px-4 rounded-lg font-semibold ${
              activeTab === "PAYMENT PENDING"
                ? "bg-purple-600 text-white"
                : "bg-gray-200 text-black"
            }`}
            onClick={() => setActiveTab("PAYMENT PENDING")}
          >
            Payment Pending
          </button>
          <button
            className={`py-2 px-4 rounded-lg font-semibold ${
              activeTab === "PAYMENT DONE"
                ? "bg-purple-600 text-white"
                : "bg-gray-200 text-black"
            }`}
            onClick={() => setActiveTab("PAYMENT DONE")}
          >
            Payment Done
          </button>
        </div>

        <p className="font-medium text-lg mt-6">Awb number</p>
        <input
          type="text"
          placeholder="Search by AWB Number"
          value={searchTerm}
          onChange={handleSearchChange}
          className="mt-1 p-2 px-4 border border-gray-300 rounded-lg w-60"
        />

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-lg font-semibold text-gray-600">
              Loading data...
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-10">
            {filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-fit h-64 bg-white rounded-lg shadow-md">
                <p className="text-lg font-semibold text-gray-600">
                  No records found
                </p>
                <p className="text-sm text-gray-400">
                  There are no payments to display for the selected status.
                </p>
              </div>
            ) : (
              filteredData.map((item, index) => (
                <PaymentConfirmCard key={index} item={item} index={index} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentConfirm;
