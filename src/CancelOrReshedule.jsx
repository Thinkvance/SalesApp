import { useState, useEffect } from "react";
import Nav from "./Nav";
import ResheduleCard from "./ResheduleCard";
import CancelCard from "./CancelCard";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import collectionName_BaseAwb from "./functions/collectionName";
function CancelOrReschedule() {
  const [data, setData] = useState([]);
  const [activeTab, setActiveTab] = useState("CANCEL");

  useEffect(() => {
    const loginCredentials = JSON.parse(
      localStorage.getItem("LoginCredentials")
    );
    const { role, Location, name } = loginCredentials;

    // Determine the Firestore query based on the role
    const collectionRef = collection(
      db,
      collectionName_BaseAwb.getCollection(Location)
    );
    // Real-time listener for Firestore data using onSnapshot
    const baseQuery =
      role === "Manager" || role === "sales admin"
        ? query(collectionRef)
        : query(collectionRef, where("pickupBookedBy", "==", name));

    const unsubscribe = onSnapshot(
      query(
        baseQuery // Apply the where filter
      ),
      (snapshot) => {
        const documents = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setData(documents); // Update the state with real-time Firestore data
      },
      (error) => {
        console.error("Error fetching Firestore data: ", error);
      }
    );

    // Cleanup the listener on component unmount
    return () => unsubscribe();
  }, []);

  // Filter data based on the active tab
  const filteredData = data?.filter((item) => {
    if (activeTab === "CANCEL" || activeTab === "RESCHEDULE") {
      return item.status === "RUN SHEET"; // Filter only items with status "RUN SHEET"
    }
    return null; // No filtering for other tabs
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
