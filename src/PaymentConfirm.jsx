import { useState, useEffect } from "react";
import Nav from "./Nav";
import PaymentConfirmCard from "./PaymentConfirmCard";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import collectionName_BaseAwb from "./functions/collectionName";
import utilityFunctions from "./Utility/utilityFunctions";
function PaymentConfirm() {
  const [data, setData] = useState([]);
  const [activeTab, setActiveTab] = useState("PAYMENT PENDING");

  useEffect(() => {
    // Parse LoginCredentials from localStorage
    const loginCredentials = JSON.parse(
      localStorage.getItem("LoginCredentials")
    );
    const { role, Location, name } = loginCredentials;

    // Determine the Firestore query based on the role
    const collectionRef = collection(
      db,
      collectionName_BaseAwb.getCollection(Location)
    );
    const baseQuery =
      role === "Manager" || role === "sales admin"
        ? query(collectionRef)
        : query(collectionRef, where("pickupBookedBy", "==", name));

    // Set up the Firestore real-time listener
    const unsubscribe = onSnapshot(
      baseQuery,
      (snapshot) => {
        const documents = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setData(documents); // Update the state with the latest data from Firestore
      },
      (error) => {
        utilityFunctions.ErrorNotify(
          "Data retrieval failed. Please try again."
        );
      }
    );

    // Cleanup listener on component unmount to prevent memory leaks
    return () => unsubscribe();
  }, []);

  const allowedStatuses = ["PAYMENT DONE", "SHIPMENT CONNECTED"];

  const filteredData = data.filter((item) => item.status === activeTab);

  const paymentdone = data.filter((item) =>
    allowedStatuses.includes(item.status)
  );

  return (
    <div className="min-h-screen bg-gray-10q0">
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
        {activeTab == "PAYMENT PENDING" ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-10">
            {filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-64  bg-white rounded-lg shadow-md">
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
        ) : activeTab == "PAYMENT DONE" ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-10">
            {paymentdone.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-64  bg-white rounded-lg shadow-md">
                <p className="text-lg font-semibold text-gray-600">
                  No records found
                </p>
                <p className="text-sm text-gray-400">
                  There are no payments to display for the selected status.
                </p>
              </div>
            ) : (
              paymentdone.map((item, index) => (
                <PaymentConfirmCard key={index} item={item} index={index} />
              ))
            )}
          </div>
        ) : (
          <p>ERROR</p>
        )}
      </div>
    </div>
  );
}

export default PaymentConfirm;
