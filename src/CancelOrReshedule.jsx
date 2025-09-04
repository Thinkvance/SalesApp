import { useState, useEffect } from "react";
import Nav from "./Nav";
import ResheduleCard from "./ResheduleCard";
import CancelCard from "./CancelCard";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import DB from "./DB/DB";
import oneMonthAgo from "./Utility/oneMonthAgo";
function CancelOrReschedule() {
  const [data, setData] = useState([]);
  const [activeTab, setActiveTab] = useState("CANCEL");
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  useEffect(() => {
    const loginCredentials = JSON.parse(
      localStorage.getItem("LoginCredentials")
    );
    if (!loginCredentials) return;
    const { role, name } = loginCredentials;
    const collectionRef = collection(db, DB.db_collection);
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
      },
      (error) => {
        console.error("Error fetching Firestore data: ", error);
      }
    );
    return () => unsubscribe();
  }, []);

  const filteredData = data?.filter((item) => {
    const awbMatch = String(item.awbNumber).includes(searchTerm);
    if (
      (activeTab === "CANCEL" || activeTab === "RESCHEDULE") &&
      item.status === "RUN SHEET"
    ) {
      return awbMatch;
    }
    return false;
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <Nav />
      <div className="max-w-screen-xl mx-auto p-5">
        <div className="flex justify-center space-x-4 mt-5">
          <button
            className={`py-2 px-4 rounded-lg font-semibold ${
              activeTab === "CANCEL"
                ? "bg-purple-600 text-white"
                : "bg-gray-200 text-black"
            }`}
            onClick={() => setActiveTab("CANCEL")}
          >
            Cancel Booking
          </button>
          <button
            className={`py-2 px-4 rounded-lg font-semibold ${
              activeTab === "RESCHEDULE"
                ? "bg-purple-600 text-white"
                : "bg-gray-200 text-black"
            }`}
            onClick={() => setActiveTab("RESCHEDULE")}
          >
            Reschedule Booking
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-10">
          {filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center w-full h-64 bg-white rounded-lg shadow-md">
              <p className="text-lg font-semibold text-gray-600">
                No records found
              </p>
              <p className="text-sm text-gray-400">
                There are no records to display for the selected status.
              </p>
            </div>
          ) : activeTab === "CANCEL" ? (
            filteredData.map((item, index) => (
              <CancelCard key={index} item={item} index={index} />
            ))
          ) : (
            filteredData.map((item, index) => (
              <ResheduleCard key={index} item={item} index={index} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default CancelOrReschedule;
