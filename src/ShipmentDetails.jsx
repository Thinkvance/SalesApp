import React, { useState, useRef, useEffect, useCallback } from "react";
import { FiClipboard, FiCheck } from "react-icons/fi";
import HeicImage from "./HeicImage";
import Lottie from "lottie-react";
import loadingAnimation from "../public/loading_sharebtn.json";

/* ------------------- Reusable Components ------------------- */

const ImageGrid = React.memo(({ images, setPreviewImage }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
    {images.map((img, i) => (
      <div
        key={i}
        onClick={() => setPreviewImage(img)}
        className="cursor-pointer group"
      >
        <HeicImage
          src={img}
          alt={`img-${i}`}
          className="w-full h-36 object-cover rounded-xl transition group-hover:scale-105"
        />
      </div>
    ))}
  </div>
));

const Field = React.memo(({ label, value }) => (
  <div className="flex flex-col">
    <span className="text-xs font-semibold text-purple-700">{label}</span>
    <span className="text-sm text-gray-800 break-words">{value || "NA"}</span>
  </div>
));

const Section = React.memo(({ title, selectedPickup, children }) => (
  <div className="bg-gray-50 border rounded-xl p-4 shadow-sm mt-4">
    <div className="flex sm:justify-between flex-col sm:flex-row gap-5">
      <h3 className="text-md font-semibold text-gray-800 ">{title}</h3>
      {selectedPickup && <p className="mb-3">{selectedPickup}</p>}
    </div>
    {children}
  </div>
));

/* ------------------- Main Component ------------------- */

const ShipmentDetails = React.memo(function ShipmentDetails({
  selectedPickup,
  closeModal,
}) {
  const [copied, setCopied] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setInitialLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  const scrollRef = useRef(null);
  const scrollPosition = useRef(0);

  /* ------------------- Timestamp ------------------- */
  function formatFirestoreTimestamp(timestamp) {
    if (!timestamp || !timestamp.seconds) return "";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
    });
  }

  /* ------------------- Scroll Fix ------------------- */
  const saveScroll = () => {
    if (scrollRef.current) {
      scrollPosition.current = scrollRef.current.scrollTop;
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollPosition.current;
    }
  }, [copied, previewImage]);

  /* ------------------- Copy ------------------- */
  const handleCopy = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      saveScroll();

      navigator.clipboard.writeText(selectedPickup.vendorAwbnumber);

      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
    [selectedPickup.vendorAwbnumber],
  );

  /* ------------------- UI ------------------- */

  return (
    <div
      onClick={() => {
        if (!previewImage) closeModal();
      }}
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-2 sm:p-4"
    >
      <div
        ref={scrollRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-5xl rounded-xl shadow-xl max-h-[95vh] overflow-y-auto px-3 sm:px-6 relative"
      >
        {/* ---- Lottie loading overlay ---- */}
        {initialLoading && (
          <div className="absolute inset-0 bg-white rounded-xl z-20 flex flex-col items-center justify-center gap-2">
            <div className="w-20 h-20">
              <Lottie animationData={loadingAnimation} loop autoplay />
            </div>
            <span className="text-sm text-gray-400">Loading details…</span>
          </div>
        )}

        <div className="sticky flex justify-between top-0 bg-white z-10 pt-4 sm:pt-8 pb-2">
          <h2 className="text-lg sm:text-2xl font-semibold text-purple-700 text-left mb-2 sm:mb-6">
            Pickup Details
          </h2>
          <button
            onClick={closeModal}
            className="text-red-500 bg-gray-100 hover:bg-gray-200 rounded-full p-2 w-9 h-9 flex items-center justify-center text-base"
          >
            ✕
          </button>
        </div>
        {/* Shipment Info */}
        <Section title="Shipment Info">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="AWB Number" value={selectedPickup.awbNumber} />
            <Field label="Destination" value={selectedPickup.destination} />
            <Field label="Service" value={selectedPickup.service} />
            <Field label="Pickup Area" value={selectedPickup.pickuparea} />
            <Field
              label="Pickup Booked By"
              value={selectedPickup.pickupBookedBy}
            />
            <Field
              label="Pickup Person"
              value={selectedPickup.pickUpPersonName}
            />
            <Field
              label="Pickup Date & Time"
              value={formatFirestoreTimestamp(selectedPickup.pickupDatetime)}
            />
          </div>

          <div className="mt-4 flex items-center gap-2">
            <span className="font-semibold text-purple-700">Status:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                selectedPickup.status === "SHIPMENT CONNECTED"
                  ? "bg-green-200 text-green-800"
                  : "bg-red-200 text-red-800"
              }`}
            >
              {selectedPickup.status || "NA"}
            </span>
          </div>
        </Section>

        {/* Consignor & Consignee */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Section title="Consignor">
            <Field label="Name" value={selectedPickup.consignorname} />
            <Field label="Phone" value={selectedPickup.consignorphonenumber} />
            <Field label="Address" value={selectedPickup.consignorlocation} />
          </Section>

          <Section title="Consignee">
            <Field label="Name" value={selectedPickup.consigneename} />
            <Field label="Phone" value={selectedPickup.consigneephonenumber} />
            <Field label="Address" value={selectedPickup.consigneelocation} />
          </Section>
        </div>

        {/* Weight */}
        <Section title="Weight Details">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Booking Weight" value={selectedPickup.weightapx} />
            <Field
              label="After Pickup"
              value={selectedPickup.postPickupWeight}
            />
            <Field
              label="Internal Weight(FW)"
              value={
                selectedPickup.internalWeight
                  ? selectedPickup.internalWeight + " KG"
                  : "NA"
              }
            />
            <Field
              label="Customer Weight(FW)"
              value={
                selectedPickup.actualWeight
                  ? selectedPickup.actualWeight + " KG"
                  : "NA"
              }
            />
          </div>
        </Section>

        {/* Payment */}
        <Section title="Payment & Cost">
          <div className="grid md:grid-cols-3 gap-4">
            <Field
              label="Payment DateTime"
              value={
                selectedPickup.internalTracking?.[3]?.datetime
                  ? formatFirestoreTimestamp(
                      selectedPickup.internalTracking[3].datetime,
                    )
                  : "N/A"
              }
            />
            <Field label="Payment Mode" value={selectedPickup.paymentMode} />
            <Field
              label="Logistics Cost"
              value={"₹ " + selectedPickup.logisticCost}
            />
            <Field label="Cost Per KG" value={"₹ " + selectedPickup.costKg} />
          </div>
        </Section>

        {/* KYC */}
        <Section title="KYC Image">
          {selectedPickup.KycImage ? (
            <a href={selectedPickup.KycImage} target="_blank" rel="noreferrer">
              <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg shadow-sm hover:bg-purple-700 active:scale-95 transition-all duration-200">
                📄 View KYC
              </button>
            </a>
          ) : (
            <p className="text-gray-500">No KYC Available</p>
          )}
        </Section>

        {/* Product Images */}
        <Section
          title="Pickup Product & Weight Images"
          selectedPickup={selectedPickup.pickupCompletedDatatime}
        >
          {selectedPickup.PRODUCTSIMAGE?.length > 0 &&
          selectedPickup.PACKAGEWEIGHTIMAGES?.length > 0 ? (
            <ImageGrid
              images={[
                ...selectedPickup.PRODUCTSIMAGE,
                ...selectedPickup.PACKAGEWEIGHTIMAGES,
              ]}
              setPreviewImage={setPreviewImage}
            />
          ) : (
            <p className="text-gray-500">No Images</p>
          )}
        </Section>

        <Section
          title="Warehouse Weight Images"
          selectedPickup={formatFirestoreTimestamp(
            selectedPickup.internalTracking?.[2]?.datetime,
          )}
        >
          {selectedPickup.volumaticActualImages?.[0]?.image?.length > 0 ? (
            <ImageGrid
              images={selectedPickup.volumaticActualImages[0].image}
              setPreviewImage={setPreviewImage}
            />
          ) : (
            <p className="text-gray-500">No Images</p>
          )}
        </Section>

        {/* Form Images */}
        <Section title="Form Images">
          {selectedPickup.FORMIMAGES?.length > 0 ? (
            <ImageGrid
              images={selectedPickup.FORMIMAGES}
              setPreviewImage={setPreviewImage}
            />
          ) : (
            <p className="text-gray-500">No Images</p>
          )}
        </Section>

        {/* AWB — last section, needs bottom spacing on mobile */}
        <Section
          title="AWB Details"
          selectedPickup={formatFirestoreTimestamp(
            selectedPickup.internalTracking?.[4]?.datetime,
          )}
        >
          {selectedPickup.AWbNumberImage ? (
            <div className="flex flex-col md:flex-row gap-4">
              <div
                onClick={() => setPreviewImage(selectedPickup.AWbNumberImage)}
                className="cursor-pointer group"
              >
                <HeicImage
                  src={selectedPickup.AWbNumberImage}
                  className="w-40 h-40 object-contain rounded-lg transition group-hover:scale-105"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-4">
                  <Field
                    label="Vendor AWB"
                    value={selectedPickup.vendorAwbnumber}
                  />

                  {selectedPickup.vendorAwbnumber && (
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-2 text-purple-600"
                    >
                      {copied ? (
                        <FiCheck className="text-green-600" />
                      ) : (
                        <FiClipboard />
                      )}
                    </button>
                  )}
                </div>

                <a
                  href={`https://shiphit.com/track-your-courier/${selectedPickup.awbHashedValue}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <button className="bg-purple-600 text-white px-4 py-1 rounded-md">
                    Track
                  </button>
                </a>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No Image</p>
          )}
        </Section>
        <div className="pb-6" />
      </div>

      {/* Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[100]"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="max-w-4xl w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <HeicImage
              src={previewImage}
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />

            <div className="sticky bottom-0  pt-3 mt-6">
              <button
                onClick={() => setPreviewImage(null)}
                className="w-full py-3 bg-purple-600 text-white rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ShipmentDetails;
