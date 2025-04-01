import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import JsBarcode from "jsbarcode";
import "jspdf-autotable";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase";
import utilityFunctions from "./Utility/utilityFunctions";

function PaymentConfirmCard({ item, index }) {
  const navigate = useNavigate();
  const barcodeRef = useRef(null); // Ref for barcode generation

  const handleAcceptClick = () => {
    const url = `/payment-confirmation-form/${item.awbNumber}`; // Use item.vendorAwbnumber if that's the correct field
    navigate(url);
    utilityFunctions.SuccessNotify(
      "Payment accepted. Redirecting to confirmation form!"
    ); // Add a success toast
  };

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
        85
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
        85
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
        135
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

  async function generate_Invoice_PDF() {
    try {
      const doc = new jsPDF("p", "pt");
      const subtotal = item.costKg * item.actualWeight;
      const nettotal = subtotal - item.discountCost;

      // Add business name and logo
      doc.setFontSize(20);
      doc.addImage("/shiphtlogo.png", "PNG", 40, 30, 180, 60); // Replace with your logo

      const maxWidth = 210; // Set the maximum width (in points) for the text

      // Bill from and bill to section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Receipt from:", 40, 140);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("Shiphit", 40, 160);

      const address = `No. 74, Tiny Sector Industrial Estate, Ekkatuthangal, Chennai - 600032. Tamilnadu, India.`;
      const phoneNumber = `\n9159 688 688`; // Add a newline before the phone number

      const fullText = address + phoneNumber; // Combine address and phone number
      const splitText1 = doc.splitTextToSize(fullText, maxWidth);
      doc.text(splitText1, 40, 180);

      // Bill To
      doc.setFont("helvetica", "bold");
      doc.text("Receipt to:", 350, 140);
      doc.setFontSize(12);

      doc.setFont("helvetica", "normal");
      doc.text(item.consignorname, 350, 160);

      const consignorLocation = item.consignorlocation.toLowerCase();
      const fullText1 = consignorLocation + "\n" + item.consignorphonenumber;
      const splitText = doc.splitTextToSize(fullText1, maxWidth);
      doc.text(splitText, 350, 180);

      // Align invoice details at the top-right corner
      const pageWidth = doc.internal.pageSize.getWidth();
      const rightMargin = pageWidth - 40; // Right margin of 40 units

      doc.setFont("helvetica", "normal");
      doc.text(`Receipt Number: RCPT-${item.awbNumber}`, rightMargin, 40, {
        align: "right",
      });
      doc.text(`Date: ${item.PaymentComfirmedDate}`, rightMargin, 61, {
        align: "right",
      });
      doc.setFont("helvetica", "bold");
      doc.text(`Total: ${nettotal}.00 Rs`, rightMargin, 80, { align: "right" });

      // Draw a line for separation
      doc.line(40, 250, 570, 250);

      // Invoice Table
      doc.autoTable({
        startY: 270,
        head: [["Country Name", "Mode", "Weight (KG):", "Cost/KG", "Total"]],
        body: [
          [
            item.destination,
            item.service + " " + "Service",
            item.actualWeight + " KG",
            `${item.costKg} Rs`,
            `${subtotal}.00 Rs`,
          ],
        ],
        theme: "grid",
        headStyles: {
          fillColor: [147, 51, 234], // Purple background color (RGB)
          textColor: [255, 255, 255], // White text
          fontSize: 12,
        },
        bodyStyles: {
          fontSize: 12,
        },
        margin: { top: 20 },
      });

      // Terms and Conditions
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Terms & Conditions:", 40, doc.lastAutoTable.finalY + 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      const terms = `* This invoice is only valid for ${item.actualWeight} Kg.
* Shipments exceeding ${item.actualWeight} KG will attract additional costs.
* All shipments sent are subject to customs clearance only.
* Customs duty applicable (if any).`;
      const splitTerms = doc.splitTextToSize(terms, maxWidth + 300);
      doc.text(splitTerms, 40, doc.lastAutoTable.finalY + 50);

      // Subtotal, Discount, and Total
      if (item.discountCost > 1) {
        // Set Subtotal text to bold
        doc.text(
          `Subtotal: ${subtotal}.00 Rs`,
          400,
          doc.lastAutoTable.finalY + 120
        );

        // Set Discount text to normal
        doc.setFont("helvetica", "normal");
        doc.text(
          `Discount: ${item.discountCost}.00 Rs`,
          400,
          doc.lastAutoTable.finalY + 139
        );

        // Set Total text to bold
        doc.text(
          `Total: ${nettotal}.00 Rs`,
          400,
          doc.lastAutoTable.finalY + 159
        );

        // Set back to normal after this section if needed
        doc.setFont("helvetica", "normal");
      } else {
        doc.text(
          `Subtotal: ${subtotal}.00 Rs`,
          400,
          doc.lastAutoTable.finalY + 120
        );
        doc.text(
          `Net Total: ${nettotal}.00 Rs`,
          400,
          doc.lastAutoTable.finalY + 139
        );
      }

      // Footer
      doc.setFontSize(10);
      doc.text(
        "Thank you for your business!",
        40,
        doc.internal.pageSize.height - 40
      );
      doc.text(
        "Company Contact Info: info@shiphit.in | +91 - 9159 688 688",
        40,
        doc.internal.pageSize.height - 30
      );

      doc.save(`Receipt_${item.consignorname}.pdf`);
      utilityFunctions.SuccessNotify("Invoice PDF generated successfully!"); // Add success toast
    } catch (error) {
      utilityFunctions.ErrorNotify("Error generating Invoice PDF. Try again.");
    }
  }

  const allowedStatuses = ["PAYMENT DONE", "SHIPMENT CONNECTED"];

  return (
    <div
      key={index}
      className="flex flex-col border border-gray-300 rounded-lg p-6 bg-white shadow-lg hover:shadow-2xl transition-shadow duration-300"
    >
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

      <div className="flex flex-col mb-4 gap-2">
        {/* <p className="text-base font-medium text-gray-800">
          <strong className="text-gray-900">Package Connected:</strong>{" "}
          {item.packageConnectedDataTime || "-"}
        </p> */}
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
          <strong className="text-gray-900">Pickup completed datetime:</strong>{" "}
          {item.pickupCompletedDatatime || "-"}
        </p>
        {item.rtoIfAny && (
          <p className="text-base font-medium text-red-600">
            <strong className="text-gray-900">RTO Information:</strong>{" "}
            {item.rtoIfAny}
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
              allowedStatuses.includes(item.status)
                ? "bg-green-500"
                : "bg-red-500"
            } text-white`}
          >
            {item.status}
          </p>
        </div>
      )}
      {item.status == "PAYMENT PENDING" ? (
        <div className="flex justify-end mt-auto">
          <button
            onClick={handleAcceptClick}
            className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 active:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors text-sm"
          >
            Accept
          </button>
        </div>
      ) : (
        ""
      )}
      {allowedStatuses.includes(item.status) ? (
        <div className="flex gap-10">
          <button
            onClick={() => generate_Invoice_PDF()}
            className="p-2 rounded-md bg-purple-600  text-white"
          >
            Receipt
          </button>
          <button
            onClick={() => generate_AWBNUMBER_PDF()}
            className="p-2 rounded-md bg-purple-600  text-white"
          >
            AWB Number
          </button>
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
