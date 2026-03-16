import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import "jspdf-autotable";
import { db } from "./firebase";
import utilityFunctions from "./Utility/utilityFunctions";
import axios from "axios";
import { doc, updateDoc } from "firebase/firestore";
import Lottie from "lottie-react";
import formatFirestoreTimestamp from "./Utility/formatFirestoreTimestamp";
import generate_GST_Invoice_PDF from "./Utility/GSTinvoice";

function PaymentConfirmCard({ item, index }) {
  const navigate = useNavigate();
  const barcodeRef = useRef(null); // Ref for barcode generation
  const [loading, setloading] = useState(false);
  const [animationData, setAnimationData] = useState(null);
  const [isOpen, setisOpen] = useState(false);
  const [gst, setGst] = useState("");
  const [gstError, setGstError] = useState("");
  const [User, setUser] = useState({});
  const validateGST = (value) => {
    const gstRegex =
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    if (value.length === 0) {
      setGstError("GST number is required");
    } else if (value.length !== 15) {
      setGstError("GST must be 15 characters");
    } else if (!gstRegex.test(value)) {
      setGstError("Invalid GST format");
    } else {
      setGstError("");
    }
  };

  useEffect(() => {
    setUser(JSON.parse(localStorage.getItem("LoginCredentials")));
  }, []);

  const handleAcceptClick = () => {
    const url = `/payment-confirmation-form/${item.awbNumber}`; // Use item.vendorAwbnumber if that's the correct field
    navigate(url);
    utilityFunctions.SuccessNotify(
      "Payment accepted. Redirecting to confirmation form!",
    ); // Add a success toast
  };

  // Fetch Lottie animation from the public folder
  useEffect(() => {
    try {
      fetch("/loading_animation.json")
        .then((response) => response.json())
        .then((data) => setAnimationData(data))
        .catch((error) => console.error("Error loading animation:", error));
    } catch (e) {
      console.log(e);
    }
  }, []);

  function generate_AWBNUMBER_PDF() {
    try {
      const doc = new jsPDF();
      // Format date as day/month/year
      const todayDate = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      // Generate barcode
      JsBarcode(barcodeRef.current, item.awbNumber, {
        format: "CODE128",
        displayValue: true,
        width: 2, // Adjust width as needed
        height: 40, // Adjust height as needed
        fontOptions: "bold", // Make the text bold
        fontSize: 16, // Increase font size for the barcode text
        textMargin: 5, // Space between the barcode and text
        margin: 10, // Margin around the barcode
        background: "#ffffff", // Background color of the barcode
        lineColor: "#000000", // Color of the bars
        scale: 4, // Higher scale for better quality
      });

      const barcodeImage = barcodeRef.current.toDataURL();

      // Add logo with adjusted size (height will auto-adjust)
      const logoUrl = "/shiphtlogo.png";
      doc.addImage(logoUrl, "PNG", 140, 10, 50, 0); // Increased width to 50, height auto-adjusts

      // Add title and date
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text(`${item.service} Service`, 20, 30);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Date: ${item.pickupCompletedDatatime}`, 20, 40);

      // Set line width for borders
      doc.setLineWidth(0.5);

      // From section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("From:", 20, 60);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(`Name: ${item.consignorname}`, 20, 70);
      doc.text(`Phone Number: ${item.consignorphonenumber}`, 20, 80);
      const fromLocation = doc.splitTextToSize(
        `Location: ${item.consignorlocation}`,
        85,
      );
      doc.text(fromLocation, 20, 90);

      // Horizontal line between "From" and "To" sections
      doc.line(10, 107, 200, 107);

      // To section
      doc.setFont("helvetica", "bold");
      doc.text("To:", 110, 60);
      doc.setFont("helvetica", "normal");
      doc.text(`Name: ${item.consigneename}`, 110, 70);
      doc.text(`Phone Number: ${item.consigneephonenumber}`, 110, 80);
      const toLocation = doc.splitTextToSize(
        `Location: ${item.consigneelocation}`,
        85,
      );
      doc.text(toLocation, 110, 90);

      // Shipment item section
      doc.setFont("helvetica", "bold");
      doc.text("Shipment item:", 20, 115); // Adjustsssssssssed Y position to place below the line
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(`Weight (kg): ${item.actualWeight} kg`, 20, 125);
      doc.text(
        `Number Of Boxes: ${item.actualNoOfPackages} / ${item.actualNoOfPackages}`,
        20,
        135,
      );
      doc.text(`Content: ${item.content}`, 20, 145);

      // Horizontal line above "AWB Number" section
      doc.line(10, 154, 200, 154); // Border above "AWB Number"

      // Add barcode section with improved quality
      doc.setFont("helvetica", "bold");
      doc.text(`AWB Number: ${item.awbNumber}`, 20, 165);
      doc.addImage(barcodeImage, "PNG", 20, 175, 100, 30);

      // Save PDF
      doc.save(`AWB NUMBER_${item.consignorname}_${item.destination}.pdf`);
      utilityFunctions.SuccessNotify("AWB Number PDF generated successfully!"); // Add success toast
    } catch (error) {
      utilityFunctions.ErrorNotify("Error generating AWB PDF. Try again.");
    }
  }

  const allowedStatuses = ["PAYMENT DONE", "SHIPMENT CONNECTED"];

  return (
    <div
      key={index}
      className="flex  relative flex-col border border-gray-300 rounded-lg p-6 bg-white shadow-lg hover:shadow-2xl transition-shadow duration-300"
    >
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl w-[90%] max-w-md p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Enter GST Number
            </h2>
            <input
              type="text"
              value={gst}
              maxLength={15}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                setGst(value);
                validateGST(value);
              }}
              placeholder="Enter GST Number"
              className={`w-full border rounded-lg p-3 outline-none focus:ring-2 ${
                gstError
                  ? "border-red-500 focus:ring-red-400"
                  : "border-gray-300 focus:ring-purple-500"
              }`}
            />
            {gstError && (
              <p className="text-red-500 text-sm mt-1">{gstError}</p>
            )}
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => {
                  setisOpen((prev) => !prev);
                  setGst("");
                }}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  if (gstError || gst.length !== 15) return;

                  generate_GST_Invoice_PDF(
                    item,
                    item.awbNumber,
                    item.costKg,
                    item.discountCost,
                    item.additionalcharges,
                    gst,
                    item.pickupDatetime,
                    setGst,
                  );

                  setisOpen(false);
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

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
        {item.makePaymentNotified ? (
          <div className=" text-sm  text-green-700 font-semibold bg-green-100 px-3 py-1 rounded-md shadow-sm">
            Payment request sent
          </div>
        ) : (
          ""
        )}
      </div>
      <div className="flex flex-col mb-4 gap-2">
        {item.consignorname && (
          <p className="text-base font-medium text-gray-800">
            <strong className="text-gray-900">Name:</strong>{" "}
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
        <p className="text-base font-medium text-gray-800">
          <strong className="text-gray-900">Final Weight:</strong>{" "}
          {item.actualWeight + " " + "KG" || "-"}
        </p>
        <p className="text-base font-medium text-gray-800">
          <strong className="text-gray-900">Final no. of boxes:</strong>{" "}
          {item.actualWeight + " " + "KG" || "-"}
        </p>
      </div>

      <div className="flex flex-col mb-4 gap-2">
        <p className="text-base font-medium text-gray-800">
          <strong className="text-gray-900">PickUp Person Name:</strong>{" "}
          {item.pickUpPersonName || "-"}
        </p>
        <p className="text-base font-medium text-gray-800">
          <strong className="text-gray-900">Pickup Datetime:</strong>{" "}
          {formatFirestoreTimestamp(item.pickupDatetime) || "-"}
        </p>
        {item.rtoIfAny && (
          <p className="text-base font-medium text-red-600">
            <strong className="text-gray-900">RTO Information:</strong>{" "}
            {item.rtoIfAny}
          </p>
        )}
      </div>
      {item.status == "PAYMENT PENDING" ||
      item.status == "PAYMENT REQUESTED" ? (
        <div className="flex justify-end mt-auto">
          <button
            onClick={handleAcceptClick}
            className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 active:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors text-sm"
          >
            Accept
          </button>
          {/* )} */}
        </div>
      ) : (
        ""
      )}
      {allowedStatuses.includes(item.status) ? (
        <div className="text-sm flex gap-10">
          <a
            target="_blank"
            href={item.payment_Receipt_URL}
            className="p-2 rounded-md bg-[#714DD9]  text-white"
          >
            Receipt
          </a>
          <button
            onClick={() => setisOpen(true)}
            className="p-2 rounded-md bg-[#714DD9]  text-white"
          >
            GST Invoice
          </button>
          {/* <button
            onClick={() => generate_AWBNUMBER_PDF()}
            className="p-2 rounded-md bg-[#714DD9]  text-white"
          >
            AWB Number
          </button> */}
        </div>
      ) : (
        ""
      )}
      <canvas ref={barcodeRef} style={{ display: "none" }} />
      <canvas ref={barcodeRef} style={{ display: "none" }} />
    </div>
  );
}
export default PaymentConfirmCard;
