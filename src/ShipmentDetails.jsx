function ShipmentDetails({ selectedPickup, closeModal }) {
  return (
    <div className="fixed inset-0 w-full bg-black bg-opacity-50 flex justify-center items-center z-50 overflow-auto">
      <div className="bg-white relative z-50 p-8 rounded-lg w-full max-w-lg shadow-lg max-h-screen overflow-y-auto">
        <h2 className="text-3xl font-semibold mb-6 text-purple-700 text-center">
          Pickup Details
        </h2>
        <div className="space-y-4 text-gray-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-gray-800">
            <p>
              <span className="font-semibold text-purple-700">AWB Number:</span>{" "}
              {selectedPickup.awbNumber || "NA"}
            </p>
            <p>
              <span className="font-semibold text-purple-700">
                Destination:
              </span>{" "}
              {selectedPickup.destination || "NA"}
            </p>
            <div className="flex flex-col gap-4">
              <p>
                <span className="font-semibold text-purple-700">
                  Consignor Name:
                </span>{" "}
                {selectedPickup.consignorname || "NA"}
              </p>
              <p>
                <span className="font-semibold text-purple-700">
                  Consignor Phone:
                </span>{" "}
                {selectedPickup.consignorphonenumber || "NA"}
              </p>
              <p>
                <span className="font-semibold text-purple-700">
                  Consignor Address:
                </span>{" "}
                {selectedPickup.consignorlocation || "NA"}
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <p>
                <span className="font-semibold text-purple-700">
                  Consignee Name:
                </span>{" "}
                {selectedPickup.consigneename || "NA"}
              </p>
              <p>
                <span className="font-semibold text-purple-700">
                  Consignee Phone:
                </span>{" "}
                {selectedPickup.consigneephonenumber || "NA"}
              </p>
              <p>
                <span className="font-semibold text-purple-700">
                  Consignee Address:
                </span>{" "}
                {selectedPickup.consigneelocation || "NA"}
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <p>
                <span className="font-semibold text-purple-700">
                  Booking Weight:
                </span>{" "}
                {selectedPickup.weightapx || "NA"}
              </p>
              <p>
                <span className="font-semibold text-purple-700">
                  After Pickup Weight:
                </span>{" "}
                {selectedPickup.postPickupWeight || "NA"}
              </p>
              <p>
                <span className="font-semibold text-purple-700">
                  Internal Weight:
                </span>{" "}
                {selectedPickup.internalWeight
                  ? selectedPickup.internalWeight + " " + "KG"
                  : "NA"}
              </p>
              <p>
                <span className="font-semibold text-purple-700">
                  Customer Weight:
                </span>{" "}
                {selectedPickup.actualWeight
                  ? selectedPickup.actualWeight + " " + "KG"
                  : "NA"}
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <p>
                <span className="font-semibold text-purple-700">Service:</span>{" "}
                {selectedPickup.service || "NA"}
              </p>
              <p>
                <span className="font-semibold text-purple-700">Vendor:</span>{" "}
                {selectedPickup.vendorName || "NA"}
              </p>
              <p>
                <span className="font-semibold text-purple-700">
                  Pickup Area:
                </span>{" "}
                {selectedPickup.pickuparea || "NA"}
              </p>
            </div>
            <div className="flex flex-col gap-6">
              {/* Status Section */}
              <div className="flex items-center">
                <span className="font-semibold text-purple-700 text-lg">
                  Status:
                </span>
                <span
                  className={`font-medium px-3 py-1 ml-1 rounded-full text-[13px]  text-nowrap ${
                    selectedPickup.status === "SHIPMENT CONNECTED"
                      ? "bg-green-200 text-green-800"
                      : "bg-red-200 text-red-800"
                  }`}
                >
                  {selectedPickup.status || "NA"}
                </span>
              </div>

              {/* Logistics Cost Section */}
            </div>
            <div
              className={`p-4 rounded-lg shadow-inner border ${
                ["PAYMENT DONE", "SHIPMENT CONNECTED"].includes(
                  selectedPickup.status
                )
                  ? "bg-green-50 border-green-300 text-green-800"
                  : "bg-gray-50 border-gray-300 text-gray-800"
              }`}
            >
              <span className="font-semibold text-purple-700 text-lg">
                Logistics Cost:
              </span>{" "}
              <span className="text-lg font-medium">
                {selectedPickup.logisticCost || "NA"}
              </span>
            </div>
            <div className="flex flex-col gap-4">
              <p>
                <span className="font-semibold text-purple-700">
                  Pickup Booked by:
                </span>{" "}
                {selectedPickup.pickupBookedBy || "NA"}
              </p>
              <p>
                <span className="font-semibold text-purple-700">
                  PickUp Person:
                </span>{" "}
                {selectedPickup.pickUpPersonName || "NA"}
              </p>
            </div>
            <p>
              <span className="font-semibold text-purple-700">
                Pickup Date & Time:
              </span>{" "}
              {selectedPickup.pickupDatetime || "NA"}
            </p>

            <p className="flex items-center gap-2 bg-gradient-to-r from-purple-100 to-purple-200 p-3 rounded-lg shadow-lg border-l-4 border-purple-700">
              <span className="font-bold text-purple-900">Source:</span>
              <span className="text-gray-700">
                {selectedPickup.Source || "NA"}
              </span>
            </p>
          </div>
        </div>
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            KYC Images
          </h3>
          {selectedPickup.KycImage ? (
            <div className="grid grid-cols-1 gap-4 bg-white p-4 rounded-lg shadow-md">
              <a
                href={selectedPickup.KycImage}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <button className="px-4 py-2 text-white bg-purple-600 rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
                  View KYC Image
                </button>
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 bg-gray-50 p-4 rounded-lg shadow-md">
              <p className="text-gray-600">No Image Available</p>
            </div>
          )}
        </div>
        {selectedPickup.PRODUCTSIMAGE?.length > 0 ? (
          <div className="mt-6 relative ">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Products Images
            </h3>
            <p className="absolute right-3 top-1">
              <span className="font-semibold text-purple-700">
                Pickup Completed:
              </span>{" "}
              {selectedPickup.pickupCompletedDatatime || "NA"}
            </p>
            <div className="grid grid-cols-1 gap-4">
              {selectedPickup.PRODUCTSIMAGE.map((d, index) => (
                <a href={d} key={index} target="_blank" className="w-fit">
                  <img
                    key={index}
                    src={d}
                    alt={`Form Image ${index + 1}`}
                    className="w-48 rounded-2xl object-scale-down h-48"
                  />
                </a>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6 pb-3 border-b-2 border-purple-700">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Products Images
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <>No Images</>
            </div>
          </div>
        )}
        {selectedPickup.PACKAGEWEIGHTIMAGES?.length > 0 ? (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Package Weight Images
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {selectedPickup.PACKAGEWEIGHTIMAGES.map((d, index) => (
                <a href={d} key={index} target="_blank" className="w-fit">
                  <img
                    key={index}
                    src={d}
                    alt={`Form Image ${index + 1}`}
                    className="w-48 rounded-2xl object-scale-down h-48"
                  />
                </a>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6 pb-3 border-b-2 border-purple-700">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Package Weight Images
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <>No Images</>
            </div>
          </div>
        )}

        {selectedPickup.FORMIMAGES?.length > 0 ? (
          <div className="mt-6 ">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Form Images
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {selectedPickup.FORMIMAGES.map((d, index) => (
                <a href={d} key={index} target="_blank" className="w-fit">
                  <img
                    key={index}
                    src={d}
                    alt={`Form Image ${index + 1}`}
                    className="w-48 rounded-2xl object-scale-down h-48"
                  />
                </a>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6 pb-3 border-b-2 border-purple-700 ">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Form Images
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <>No Images</>
            </div>
          </div>
        )}
        <div className="mt-6 ">
          {selectedPickup.PickupPersonImageURL ? (
            <div className="grid grid-cols-1 gap-4 pb-3 border-b-2 border-purple-700">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Pickup Person Image
              </h3>
              <a
                href={selectedPickup.PickupPersonImageURL}
                target="_blank"
                className="w-fit"
              >
                <img
                  src={selectedPickup.PickupPersonImageURL}
                  className="w-48 rounded-2xl object-scale-down h-48"
                />
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 pb-3 border-b-2 border-purple-700">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Pickup Person Image
              </h3>
              <p>No Image</p>
            </div>
          )}
        </div>
        <div className="mt-6 pb-3">
          {selectedPickup?.volumaticActualImages?.length > 0 ? (
            selectedPickup.volumaticActualImages.map((item, index) => (
              <>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Final Weight Images
                </h3>
                <div key={index} className="mb-6">
                  <h4 className="text-md font-semibold capitalize text-purple-700 mb-3">
                    {item.type} Images
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {item.image?.map((imgUrl, imgIndex) => (
                      <a
                        href={imgUrl}
                        key={imgIndex}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-fit"
                      >
                        <div className="bg-white border rounded-lg shadow-md overflow-hidden">
                          <img
                            src={imgUrl}
                            alt={`${item.type}-${imgIndex}`}
                            className="w-full h-40 object-cover"
                          />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </>
            ))
          ) : (
            <div className="grid grid-cols-1 gap-4 pb-3 border-b-2 border-purple-700">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Final Weight Images
              </h3>
              <p>No Image</p>
            </div>
          )}
        </div>

        <div className="mt-6">
          {selectedPickup.paymentProof ? (
            <div className="relative grid grid-cols-1 gap-4 pb-3 border-b-2 border-purple-700">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Payment Proof
              </h3>
              <p className="w-2/4 absolute right-3 top-1">
                <span className="font-semibold text-purple-700">
                  Payment Confirmed:
                </span>{" "}
                {selectedPickup.PaymentComfirmedDate || "NA"}
              </p>
              <a
                href={selectedPickup.paymentProof}
                target="_blank"
                className="w-fit"
              >
                <img
                  src={selectedPickup.paymentProof}
                  className="w-48 rounded-2xl object-scale-down h-48"
                />
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 pb-3 border-b-2 border-purple-700">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Payment Proof{" "}
              </h3>
              <p>No Image</p>
            </div>
          )}
        </div>
        <div className="mt-6">
          {selectedPickup.AWbNumberImage ? (
            <div className="relative grid grid-cols-1 gap-4 pb-3 border-b-2 border-purple-700">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                AWb Number Image
              </h3>
              <p className="w-1/2 absolute right-3 top-1">
                <span className="font-semibold text-purple-700">
                  Package Connected:
                </span>
                {selectedPickup.packageConnectedDataTime || "NA"}
              </p>
              <a
                href={selectedPickup.AWbNumberImage}
                target="_blank"
                className="w-fit"
              >
                <img
                  src={selectedPickup.AWbNumberImage}
                  className="w-48 rounded-2xl object-scale-down h-48"
                />
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 pb-3 border-b-2 border-purple-700">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                AWb Number Image{" "}
              </h3>
              <p>No Image</p>
            </div>
          )}
        </div>

        <button
          onClick={closeModal}
          className="mt-6 w-fit absolute top-0 right-0 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          Close
        </button>
        <button
          onClick={closeModal}
          className="mt-6 w-full top-0 right-0 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default ShipmentDetails;
