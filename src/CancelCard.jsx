import { useEffect, useState } from "react";
import {
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  collection,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import collectionName_BaseAwb from "./functions/collectionName";
import utilityFunctions from "./Utility/utilityFunctions";
import formatFirestoreTimestamp from "./Utility/formatFirestoreTimestamp";

function CancelCard({ item, index }) {
  // const [details, setDetails] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [error, seterror] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false); // State for button loading
  const [User, setUser] = useState({});
  useEffect(() => {
    setUser(JSON.parse(localStorage.getItem("LoginCredentials")));
  }, []);

  const handleAcceptClick = async (awbNumber) => {
    if (cancelReason.length < 10 || cancelReason.length > 100) {
      seterror("Reason must be between 10 to 100 characters long.");
      return;
    }
    seterror("");
    setIsSubmitting(true);
    try {
      const q = query(
        collection(
          db,
          collectionName_BaseAwb.getCollection(
            JSON.parse(localStorage.getItem("LoginCredentials")).Location,
          ),
        ),
        where("awbNumber", "==", awbNumber),
      );
      const querySnapshot = await getDocs(q);
      let final_result = [];

      querySnapshot.forEach((doc) => {
        final_result.push({ id: doc.id, ...doc.data() });
      });

      if (final_result.length === 0) {
        throw new Error(
          "No matching AWB number found in the pickups collection",
        );
      }

      const matchedData = final_result[0];

      // Step 2: Push the matched data into the "cancelled_data" collection
      const cancelledData = {
        ...matchedData, // All existing data from the matched document
        cancelReason: cancelReason, // Add the cancelReason field
        cancelledAt: serverTimestamp(), // Add a cancellation timestamp if needed
      };
      await addDoc(collection(db, "cancelled_data"), cancelledData);
      // Step 3: Delete the matched document from the "pickups" collection
      const userDocRef = doc(
        db,
        collectionName_BaseAwb.getCollection(
          JSON.parse(localStorage.getItem("LoginCredentials")).Location,
        ),
        matchedData.id,
      );
      await deleteDoc(userDocRef);
      setIsModalOpen(false); // Close the modal after cancellation
    } catch (error) {
      utilityFunctions.ErrorNotify("Error in handling booking cancellation.");
    } finally {
      setIsSubmitting(false); // Stop loading after completion
    }
  };

  const handleCancelClick = () => {
    setIsModalOpen(true); // Open the modal when the cancel button is clicked
  };

  const handleCloseModal = () => {
    setCancelReason("");
    seterror("");
    setIsModalOpen(false); // Close the modal
  };

  return (
    <div
      key={index}
      className="flex flex-col border border-gray-300 rounded-lg p-6 bg-white shadow-lg hover:shadow-2xl transition-shadow duration-300"
    >
      <div className="flex justify-between mb-2">
        <div>
          {User.role == "Manager" ? (
            <div className=" text-sm  text-purple-700 font-semibold bg-white-100 border-[1px] border-gray-200 px-3 py-1 rounded-md ">
              {item.pickupBookedBy}
            </div>
          ) : (
            ""
          )}
        </div>
      </div>
      <div className="flex flex-col mb-4 gap-2">
        {item.consignorname && (
          <p className="text-base font-medium text-gray-800">
            <strong className="text-gray-900">Name:</strong>{" "}
            {item.consignorname}
          </p>
        )}
        <p className="text-base font-medium text-gray-800">
          <strong className="text-gray-900">Shiphit AWB Number:</strong>{" "}
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

      {item.actualWeight != "" ? (
        <div className="flex flex-col mb-4 gap-2">
          <p className="text-base font-medium text-gray-800">
            <strong className="text-gray-900">Final Weight:</strong>{" "}
            {item.actualWeight + " KG" || "-"}
          </p>
        </div>
      ) : (
        <></>
      )}

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
            {formatFirestoreTimestamp(item.pickupDatetime) || "-"}
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
      </div>

      {item.status && (
        <div className="flex items-center gap-2 mb-4">
          <p className="text-base font-medium text-gray-800">
            <strong className="text-gray-900">Status:</strong>
          </p>
          <p
            className={`rounded-full py-1 px-3 text-sm font-semibold text-center ${
              item.status === "PAYMENT DONE" ? "bg-green-500" : "bg-red-500"
            } text-white`}
          >
            {item.status}
          </p>
        </div>
      )}

      <div className="flex justify-end mt-auto">
        <button
          onClick={() => handleCancelClick(item.awbNumber)}
          className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 active:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors text-sm"
        >
          Cancel
        </button>
      </div>

      {/* Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Cancel Booking</h2>

              <button
                onClick={handleCloseModal}
                className="text-gray-600 hover:text-gray-800 focus:outline-none"
              >
                &#x2715; {/* Close button */}
              </button>
            </div>
            <div className="mb-2 flex items-end gap-2">
              <p className="text-lg font-medium">Awb Number:</p>
              <span className="text-purple-500 text-[17px] font-medium">
                {item.awbNumber}
              </span>
            </div>
            <p className="mb-2">Are you sure you want to cancel the booking?</p>
            {/* Reason Input */}
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Reason for Cancelation:
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-4"
              rows="3"
              placeholder="Provide the reason for cancellation"
            />
            {error && <p className="text-red-600">{error}</p>}
            <div className="flex justify-end">
              <button
                onClick={() => handleAcceptClick(item.awbNumber)}
                disabled={isSubmitting} // Disable button while loading
                className={`${
                  isSubmitting ? "bg-purple-300" : "bg-purple-600"
                } text-white py-2 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50`}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default CancelCard;
