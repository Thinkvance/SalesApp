import { useState, useEffect } from "react";
import apiURL from "./apiURL";
import axios from "axios";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";
import collectionName_BaseAwb from "./functions/collectionName";
function CancelCard({ item, index }) {
  const API_URL = apiURL.CHENNAI;
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal state
  const [selectedDate, setSelectedDate] = useState(); // DateTime state
  const [loading, setloading] = useState(false);
  const [Hour, setHour] = useState(""); // DateTime state
  const [Timeperiod, setTimeperiod] = useState(""); // DateTime state

  // Handle reschedule click
  const handleAcceptClick = async (awbNumber) => {
    setloading(true);
    // pickupDatetime

    const q = query(
      collection(
        db,
        collectionName_BaseAwb.getCollection(
          JSON.parse(localStorage.getItem("LoginCredentials")).Location
        )
      ),
      where("awbNumber", "==", awbNumber)
    );

    const querySnapshot = await getDocs(q);
    let final_result = [];

    querySnapshot.forEach((doc) => {
      final_result.push({ id: doc.id, ...doc.data() });
    });

    const docRef = doc(
      db,
      collectionName_BaseAwb.getCollection(
        JSON.parse(localStorage.getItem("LoginCredentials")).Location
      ),
      final_result[0].id
    ); // db is your Firestore instance

    const updatedFields = {
      pickupDatetime: selectedDate + " " + "&" + Hour + " " + Timeperiod,
    };

    updateDoc(docRef, updatedFields);

    setloading(false);
    setIsModalOpen(false); // Close the modal after submission
  };

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const result = await axios.get(API_URL);
      } catch (error) {
        console.log(error);
      }
    };
    fetchDetails();
  }, [API_URL]);

  const openModal = () => {
    setIsModalOpen(true); // Open the modal
  };

  const closeModal = () => {
    setIsModalOpen(false); // Close the modal
  };

  return (
    <div
      key={index}
      className="flex flex-col border border-gray-300 rounded-lg p-6 bg-white shadow-lg hover:shadow-2xl transition-shadow duration-300"
    >
      <div className="flex flex-col mb-4 gap-2">
        {item.consignorname && (
          <p className="text-base font-medium text-gray-800">
            <strong className="text-gray-900">Name:</strong>
            {item.consignorname}
          </p>
        )}
        <p className="text-base font-medium text-gray-800">
          <strong className="text-gray-900">Shiphit AWB Number:</strong>
          {item.awbNumber || "-"}
        </p>
      </div>
      <div className="flex flex-col mb-4 gap-2">
        {item.consignorphonenumber && (
          <p className="text-base font-medium text-gray-800">
            <strong className="text-gray-900">Phone Number:</strong>{" "}
            {item.consignorphonenumber}
          </p>
        )}
        {item.destination && (
          <p className="text-base font-medium text-gray-800">
            <strong className="text-gray-900">Destination:</strong>{" "}
            {item.destination}
          </p>
        )}
      </div>
      <div className="flex flex-col mb-4 gap-2">
        {item.pickUpPersonName != "" ? (
          <p className="text-base font-medium text-gray-800">
            <strong className="text-gray-900">PickUp Person Name:</strong>{" "}
            {item.pickUpPersonName || "-"}
          </p>
        ) : (
          <></>
        )}
        {item.pickupDatetime && (
          <p className="text-base font-medium text-gray-800">
            <strong className="text-gray-900">Pickup Booked At:</strong>{" "}
            {item.pickupDatetime || "-"}
          </p>
        )}
        {item.rtoIfAny && (
          <p className="text-base font-medium text-red-600">
            <strong className="text-gray-900">RTO Information:</strong>{" "}
            {item.rtoIfAny}
          </p>
        )}
        {item.weightapx && (
          <p className="text-base font-medium text-gray-900">
            <strong className="text-gray-900">Apx Weight:</strong>{" "}
            {item.weightapx}
          </p>
        )}
        {item.actualWeight && (
          <p className="text-base font-medium text-gray-900">
            <strong className="text-gray-900">Final weight:</strong>{" "}
            {item.actualWeight}
          </p>
        )}
        {item.vendorName && (
          <p className="text-base font-medium text-gray-900">
            <strong className="text-gray-900">Vendor (Carrier):</strong>{" "}
            {item.vendorName}
          </p>
        )}
      </div>
      {item.status && (
        <div className="flex items-center gap-2 mb-4">
          <p className="text-base font-medium text-gray-800">
            <strong className="text-gray-900">Status:</strong>
          </p>
          <p
            className={`rounded-full py-1 px-3 text-sm font-semibold text-center  text-white bg-red-500`}
          >
            {item.status}
          </p>
        </div>
      )}
      <div className="flex justify-end mt-auto">
        <button
          onClick={openModal} // Open modal on click
          className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 active:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors text-sm"
        >
          Reschedule
        </button>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg w-full space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Reschedule Booking
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-800 focus:outline-none"
              >
                &#x2715;
              </button>
            </div>

            {/* Friendly Prompt */}
            <p className="text-sm text-gray-700 mb-4">
              Are you sure you want to{" "}
              <strong className="text-purple-600">Reschedule</strong> the
              booking for{" "}
              <strong className="text-purple-600">
                AWB Number {item.awbNumber}
              </strong>
              ? Please select the new date and time below.
            </p>

            {/* Current Pickup Date and Time */}
            <p className="text-sm text-gray-600 mb-4">
              <strong className="text-gray-800">
                Current Pickup Date and Time:
              </strong>{" "}
              {item.pickupDatetime.toLocaleString()}
            </p>

            {/* Date Picker */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Select New Date:
              </label>
              <input
                type="date"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-4"
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  const day = date.getDate(); // Get day without leading zero
                  const month = date.getMonth() + 1; // Get month (0-indexed, so +1) without leading zero
                  setSelectedDate(`${day}-${month}`);
                }}
              />
            </div>

            {/* Time Picker */}
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">
                Pickup Time:
              </label>

              {/* Time Dropdown */}
              <div className="flex space-x-2">
                {/* Hour Dropdown */}
                <select
                  className="w-1/2 px-3 py-2 border rounded-md focus:outline-none focus:border-[#8847D9]"
                  onChange={(e) => setHour(e.target.value)}
                >
                  <option value="">Select Hour</option>
                  {[...Array(12).keys()].map((hour) => (
                    <option key={hour + 1} value={hour + 1}>
                      {hour + 1}:00
                    </option>
                  ))}
                </select>

                {/* AM/PM Dropdown */}
                <select
                  className="w-1/2 px-3 py-2 border rounded-md focus:outline-none focus:border-[#8847D9]"
                  onChange={(e) => setTimeperiod(e.target.value)}
                >
                  <option value="">AM/PM</option>
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4">
              <button
                onClick={closeModal}
                className="bg-gray-400 text-white py-2 px-4 rounded-lg hover:bg-gray-500 active:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAcceptClick(item.awbNumber)}
                className={`py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
                  loading
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 focus:ring-purple-500"
                }`}
                disabled={loading}
              >
                {loading ? "Loading..." : "Submit Reschedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CancelCard;
