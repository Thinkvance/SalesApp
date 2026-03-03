import { useState, useEffect } from "react";
import Nav from "./Nav";
import PaymentConfirmCard from "./PaymentConfirmCard";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import collectionName_BaseAwb from "./functions/collectionName";
import utilityFunctions from "./Utility/utilityFunctions";
import oneMonthAgo from "./Utility/oneMonthAgo.js";
import jsPDF from "jspdf";

function PaymentConfirm() {
  const [data, setData] = useState([]);
  const [activeTab, setActiveTab] = useState("PAYMENT PENDING");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loginCredentials = JSON.parse(
      localStorage.getItem("LoginCredentials"),
    );
    if (!loginCredentials) return;

    const { role, Location, name } = loginCredentials;

    const collectionRef = collection(
      db,
      collectionName_BaseAwb.getCollection(Location),
    );

    const baseQuery =
      role === "Manager" || role === "sales admin"
        ? query(collectionRef, orderBy("pickupDatetime", "desc"))
        : query(
            collectionRef,
            where("pickupBookedBy", "==", name),
            where("pickupDatetime", ">=", Timestamp.fromDate(oneMonthAgo)),
            orderBy("pickupDatetime", "desc"),
          );

    const unsubscribe = onSnapshot(
      baseQuery,
      (snapshot) => {
        const documents = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setData(documents);
        setLoading(false);
      },
      (error) => {
        console.log(error);
        // utilityFunctions.ErrorNotify(
        //   "Data retrieval failed. Please try again.",
        // );
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const allowedStatusesPending = ["PAYMENT PENDING", "PAYMENT REQUESTED"];
  const allowedStatusesDone = [
    "PAYMENT DONE",
    "SHIPMENT CONNECTED",
    "PAYMENT REQUESTED",
  ];

  const filteredData = data.filter(
    (item) =>
      (activeTab === "PAYMENT PENDING"
        ? allowedStatusesPending.includes(item.status)
        : allowedStatusesDone.includes(item.status)) &&
      String(item.awbNumber).includes(searchTerm),
  );

  async function generate_Invoice_PDF_Test() {
    const doc = new jsPDF("p", "pt");

    // -------------------------
    // Sample Data
    // -------------------------
    const details = {
      consignorname: "John Doe",
      consignorlocation: "Chennai, Tamil Nadu",
      consignorphonenumber: "9876543210",
      destination: "United Kingdom",
      service: "Express",
      actualWeight: 5,
      awbNumber: "AWB123456",
    };

    const costKg = 500;
    const discountCost = 200;
    const additionalcharges = 150;
    const invoiceNumber = "001";

    const subtotal = costKg * details.actualWeight;
    const nettotal = subtotal - discountCost + additionalcharges;
    const year = new Date().getFullYear();

    // -------------------------
    // Header
    // -------------------------
    doc.setFontSize(20);
    doc.addImage("/shiphtlogo.png", "PNG", 40, 30, 180, 60); // Replace with your logo

    // Receipt From
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Receipt from:", 40, 120);

    doc.setFont("helvetica", "normal");
    doc.text("ShipHit", 40, 140);

    const address =
      "2C, Rajarajan Street, Main Rd, Navarathna Garden, Ekkatuthangal, Chennai, Tamil Nadu 600032\n9159 688 688";
    const splitAddress = doc.splitTextToSize(address, 250);
    doc.text(splitAddress, 40, 160);

    // Receipt To
    doc.setFont("helvetica", "bold");
    doc.text("Receipt to:", 350, 120);

    doc.setFont("helvetica", "normal");
    doc.text(details.consignorname, 350, 140);

    const splitConsignor = doc.splitTextToSize(
      details.consignorlocation + "\n" + details.consignorphonenumber,
      200,
    );
    doc.text(splitConsignor, 350, 160);

    // Top Right Info
    const pageWidth = doc.internal.pageSize.getWidth();
    const rightMargin = pageWidth - 40;

    doc.text(`Invoice Number: SHRT-${year}${invoiceNumber}`, rightMargin, 40, {
      align: "right",
    });

    doc.text(
      `Booking Date: ${new Date().toLocaleDateString()}`,
      rightMargin,
      60,
      {
        align: "right",
      },
    );

    doc.setFont("helvetica", "bold");
    doc.text(`Total: ${nettotal}.00 Rs`, rightMargin, 80, {
      align: "right",
    });

    // Line
    doc.line(40, 230, 570, 230);

    // -------------------------
    // Table
    // -------------------------
    doc.autoTable({
      startY: 250,
      head: [["Country Name", "Mode", "Weight (KG)", "Cost/KG", "Total"]],
      body: [
        [
          details.destination,
          details.service + " Service",
          details.actualWeight + " KG",
          `${costKg} Rs`,
          `${subtotal}.00 Rs`,
        ],
      ],
      theme: "grid",
      headStyles: {
        fillColor: [147, 51, 234],
        textColor: [255, 255, 255],
        fontSize: 12,
      },
      bodyStyles: {
        fontSize: 12,
      },
    });

    // -------------------------
    // Totals Block (Right Side Styled)
    // -------------------------
    const labelX = 330;
    const valueX = 460;
    let currentY = doc.lastAutoTable.finalY + 40;

    // Subtotal
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Subtotal:", labelX, currentY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 128, 0);
    doc.text(`${subtotal}.00 Rs`, valueX, currentY);
    currentY += 20;

    // Additional Charges
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Additional Charges:", labelX, currentY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 128, 0);
    doc.text(`+ ${additionalcharges}.00 Rs`, valueX, currentY);
    currentY += 20;

    // Discount
    if (discountCost > 0) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Discount:", labelX, currentY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(220, 20, 60);
      doc.text(`- ${discountCost}.00 Rs`, valueX, currentY);
      currentY += 20;
    }

    // Total
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Total:", labelX, currentY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 100, 0);
    doc.text(`${nettotal}.00 Rs`, valueX, currentY);

    doc.setTextColor(0, 0, 0);

    // -------------------------
    // Terms & Conditions
    // -------------------------
    let sectionStartY = currentY + 40;

    if (sectionStartY > doc.internal.pageSize.height - 120) {
      doc.addPage();
      sectionStartY = 40;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Terms & Conditions", 40, sectionStartY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const termsText = `
• This invoice is only valid for ${details.actualWeight} Kg.
• Shipments exceeding ${details.actualWeight} KG will attract additional costs.
• All shipments sent are subject to customs clearance only.
• Customs duty applicable (if any).
`;

    const splitTerms = doc.splitTextToSize(termsText, 520);
    doc.text(splitTerms, 40, sectionStartY + 10);

    // -------------------------
    // Cancellation & Refund Policy
    // -------------------------
    // ✅ Capture actual ending Y
    let afterTermsY = sectionStartY + 20 + splitTerms.length * 13;
    let policyStartY = afterTermsY + -10; // 👈 Reduced spacing here

    if (policyStartY > doc.internal.pageSize.height - 120) {
      doc.addPage();
      policyStartY = 40;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Cancellation & Refund Policy", 40, policyStartY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const policyText = `
We strive to meet our commitments in terms of service and in case of failure to do so, we will work with customers on a case-to-case basis to sort the issue.

Our Cancellation Policy:
• Customers can cancel the order before shipment is handed over (typically before 8 PM same day after confirmation/payment).
• Once handed over by end of day, cancellations cannot be entertained.

Our Refund Policy:
• Refunds are entertained only for damage or delays within our control.
• Refunds apply only if packing was done by ShipHit without customer weight reduction request.
• No refunds for fragile/delicate shipments sent via duty free/Self mode.
• Damage must be reported within 48 hours of delivery.
• No refunds for delay/abandonment due to customs clearance.
• In case of loss, refund includes logistics cost and max product value $100 or declared invoice value (whichever higher).
• For refund assessment within 3 business days submit damage pictures and packaging proof.
• Maximum refund limited to declared damaged item value.
• Refund processed via wallet credit note or bank transfer within 7 working days.
`;

    const splitPolicy = doc.splitTextToSize(policyText, 520);
    doc.text(splitPolicy, 40, policyStartY + 10);

    // -------------------------
    // Footer
    // -------------------------
    doc.setFontSize(10);
    doc.text(
      "Thank you for your business!",
      40,
      doc.internal.pageSize.height - 40,
    );
    doc.text(
      "Company Contact Info: info@shiphit.com | +91 - 9159 688 688",
      40,
      doc.internal.pageSize.height - 25,
    );

    // Download
    doc.save("Sample_Receipt.pdf");
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Nav />
      <div className="max-w-screen-xl mx-auto p-5">
        <div className="flex justify-center space-x-4 mt-5">
          <button onClick={() => generate_Invoice_PDF_Test()}>Test</button>
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

        <p className="font-medium text-lg mt-6">Awb number</p>
        <input
          type="text"
          placeholder="Search by AWB Number"
          value={searchTerm}
          onChange={handleSearchChange}
          className="mt-1 p-2 px-4 border border-gray-300 rounded-lg w-60"
        />

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-lg font-semibold text-gray-600">
              Loading data...
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-10">
            {filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-fit h-64 bg-white rounded-lg shadow-md">
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
        )}
      </div>
    </div>
  );
}

export default PaymentConfirm;
