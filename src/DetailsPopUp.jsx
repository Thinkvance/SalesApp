import React from "react";

function DetailsPopUp() {
  return (
    <>
      {isModalOpen && selectedPickup && (
        <div className="fixed inset-0  bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-2xl font-bold mb-4 text-purple-700">
              Pickup Details
            </h2>
            <div>
              <p>
                <strong>AWB Number:</strong> {selectedPickup.awbNumber}
              </p>
              <p>
                <strong>Consignor Name:</strong> {selectedPickup.consignorname}
              </p>
              <p>
                <strong>Consignor Phone:</strong>{" "}
                {selectedPickup.consignorphonenumber}
              </p>
              <p>
                <strong>Destination:</strong> {selectedPickup.destination}
              </p>
              <p>
                <strong>Weight (Apx):</strong> {selectedPickup.weightapx}
              </p>
              <p>
                <strong>Vendor:</strong> {selectedPickup.vendorName}
              </p>
              <p>
                <strong>Pickup Area:</strong> {selectedPickup.pickuparea}
              </p>
              <p>
                <strong>Status:</strong> {selectedPickup.status}
              </p>
              <p>
                <strong>Pickup Date & Time:</strong>{" "}
                {selectedPickup.pickupDatetime}
              </p>
              <p>
                <strong>Pickup Booked by:</strong>{" "}
                {selectedPickup.pickupBookedBy}
              </p>
              <p>
                <strong>PickUp Person:</strong>{" "}
                {selectedPickup.pickUpPersonName}
              </p>
            </div>
            {selectedPickup.FORMIMAGES.map((d) => (
              <>
                <img src={d} alt="" className="w-96 object-cover h-48" />
              </>
            ))}
            <button
              onClick={closeModal}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default DetailsPopUp;
