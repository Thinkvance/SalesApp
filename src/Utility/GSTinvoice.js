import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { storage } from "../firebase";

async function generate_GST_Invoice_PDF(
  item,
  awbNumber,
  costKg,
  discountCost,
  gst,
  pickupDatetime,
  gstInvoiceNumber,
  chargesList,
) {
  const normalisedCharges = Array.isArray(chargesList) ? chargesList : [];
  const additionalChargesTotal = normalisedCharges.reduce(
    (sum, row) => sum + (Number(row?.amount) || 0),
    0,
  );
  try {
    const actualWeight = item.actualWeight;
    const consignorname = item.consignorname;
    const consignorlocation = item.consignorlocation;
    const consignorphonenumber = item.consignorphonenumber;

    const GST_COST = (costKg * 0.18).toFixed(2);
    const GST_COST_value = GST_COST * actualWeight;

    const subtotal =
      Number(costKg) * Number(actualWeight) -
      Number(GST_COST) * Number(actualWeight);

    const nettotal =
      subtotal + GST_COST_value + additionalChargesTotal - discountCost;

    const doc = new jsPDF("p", "pt");

    function formatFirebaseTimestamp(timestamp) {
      if (!timestamp) return "";

      const date = timestamp.toDate();

      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();

      return `${day}/${month}/${year}`;
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = 210;

    /* ---------------- Logo ---------------- */

    doc.addImage("/shiphtlogo.png", "PNG", 40, 30, 180, 60);

    /* ---------------- Bill From ---------------- */

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("PETTI ECOM INDIA PRIVATE LIMITED", 40, 140);

    doc.setFont("helvetica", "bold");
    doc.text(`GSTIN: 33AANCP4213G1ZM`, 40, 160);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    const address = `2C, Rajarajan Street, Main Rd, Navarathna Garden,
Ekkatuthangal, Chennai, Tamil Nadu 600032
Phone: 9159 688 688`;

    const splitTextFrom = doc.splitTextToSize(address, maxWidth);

    doc.text(splitTextFrom, 40, 178);

    /* ---------------- Bill To ---------------- */

    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 350, 140);

    doc.text(consignorname, 350, 160);

    doc.text(`GSTIN: ${gst || "N/A"}`, 350, 178);

    const toText =
      consignorlocation.toLowerCase() + "\n" + `Phone: ${consignorphonenumber}`;

    const splitTextTo = doc.splitTextToSize(toText, maxWidth);

    doc.setFont("helvetica", "normal");
    doc.text(splitTextTo, 350, 195);

    /* ---------------- Invoice Info ---------------- */

    const rightX = pageWidth - 40;

    doc.text(`Invoice Number: ${gstInvoiceNumber}`, rightX, 40, {
      align: "right",
    });

    doc.text(
      `Pickup Booking Date: ${formatFirebaseTimestamp(pickupDatetime)}`,
      rightX,
      60,
      { align: "right" },
    );

    doc.setFont("helvetica", "bold");
    doc.text(`Total: ${nettotal.toFixed(2)} Rs`, rightX, 80, {
      align: "right",
    });

    /* ---------------- Table ---------------- */

    doc.autoTable({
      startY: 270,
      head: [
        [
          "Country Name",
          "Mode",
          "Weight (KG)",
          "Cost/KG",
          "GST (18%)",
          "Amount",
        ],
      ],
      body: [
        [
          item.destination,
          item.service + " Service",
          actualWeight + " KG",
          `${parseInt(costKg - costKg * 0.18)} Rs`,
          `${GST_COST_value.toFixed(2)} Rs`,
          `${subtotal.toFixed(2)} Rs`,
        ],
      ],
      theme: "grid",
      headStyles: {
        fillColor: [147, 51, 234],
        textColor: [255, 255, 255],
      },
      bodyStyles: { fontSize: 12 },
    });

    /* ---------------- Summary (Below Table) ---------------- */

    const labelX = 300;
    const valueX = 490;

    let y = doc.lastAutoTable.finalY + 30;

    doc.setFont("helvetica", "bold");
    doc.text("Subtotal:", labelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${subtotal.toFixed(2)} Rs`, valueX, y);

    y += 20;

    doc.setFont("helvetica", "bold");
    doc.text("SGST (9%):", labelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${(GST_COST * actualWeight).toFixed(2) / 2} Rs`, valueX, y);

    y += 20;

    doc.setFont("helvetica", "bold");
    doc.text("CGST (9%):", labelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${(GST_COST * actualWeight).toFixed(2) / 2} Rs`, valueX, y);

    y += 20;

    normalisedCharges.forEach((row) => {
      if (!row || !(Number(row.amount) > 0)) return;
      if (y > doc.internal.pageSize.height - 80) {
        doc.addPage();
        y = 60;
      }
      doc.setFont("helvetica", "bold");
      const chargeLabel = row.reason || "Additional Charges";
      doc.text(chargeLabel, labelX, y);
      doc.setFont("helvetica", "normal");
      doc.text(`+ ${Number(row.amount).toFixed(2)} Rs`, valueX, y);
      y += 20;
    });

    if (discountCost > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("Discount:", labelX, y);
      doc.setFont("helvetica", "normal");
      doc.text(`- ${Number(discountCost).toFixed(2)} Rs`, valueX, y);
      y += 20;
    }

    if (y > doc.internal.pageSize.height - 80) {
      doc.addPage();
      y = 60;
    }

    doc.line(labelX, y - 14, valueX + 60, y - 14);

    doc.setFont("helvetica", "bold");
    doc.text("Total:", labelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${nettotal.toFixed(2)} Rs`, valueX, y);

    /* ---------------- Terms (paginated) ---------------- */

    const pageHeight = doc.internal.pageSize.height;
    const footerReserve = 70;
    const bodyLineHeight = 13;
    const headingLineHeight = 20;

    let tcY = y + 30;

    const ensureSpace = (needed) => {
      if (tcY + needed > pageHeight - footerReserve) {
        doc.addPage();
        tcY = 50;
      }
    };

    const drawHeading = (text) => {
      ensureSpace(headingLineHeight);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text(text, 40, tcY);
      tcY += headingLineHeight;
    };

    const drawParagraph = (text) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const lines = doc.splitTextToSize(text, 500);
      lines.forEach((line) => {
        ensureSpace(bodyLineHeight);
        doc.text(line, 40, tcY);
        tcY += bodyLineHeight;
      });
    };

    drawHeading("Terms & Conditions");
    drawParagraph(
      `* This invoice is only valid for ${actualWeight} KG.\n* All shipments are subject to customs clearance only.`,
    );

    tcY += 8;
    drawHeading("Cancellation & Refund Policy");
    drawParagraph(
      `We strive to meet our commitments in terms of service and in case of failure to do so, we will work with customers on a case-to-case basis to sort the issue.\n\nOur Cancellation Policy:\n• Customers can cancel the order before shipment is handed over (typically before 8 PM same day after confirmation/payment).\n• Once handed over by end of day, cancellations cannot be entertained.\n\nOur Refund Policy:\n• Refunds are entertained only for damage or delays within our control.\n• Refunds apply only if packing was done by ShipHit without customer weight reduction request.\n• No refunds for fragile/delicate shipments sent via duty free/Self mode.\n• Damage must be reported within 48 hours of delivery.\n• No refunds for delay/abandonment due to customs clearance.\n• In case of loss, refund includes logistics cost and max product value $100 or declared invoice value (whichever is lower).\n• For important products, opt for insurance by declaring just 5% of the invoice value (available for Economy and Express services only) to receive full reimbursement.\n• For refund assessment within 3 business days submit damage pictures and packaging proof.\n• Maximum refund limited to declared damaged item value.\n• Refund processed via wallet credit note or bank transfer within 7 working days.`,
    );

    /* ---------------- Footer on every page ---------------- */

    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("Thank you for your business!", 40, pageHeight - 40);
      doc.text(
        "Contact: info@shiphit.com | +91 - 9159 688 688",
        40,
        pageHeight - 28,
      );
    }

    /* ---------------- Save ---------------- */

    // Save the PDF as a Blob
    const pdfBlob = doc.output("blob");

    // Reference to Firebase Storage
    const storagePath = `${item.awbNumber}/invoice/Receipt${item.consignorname} .pdf`;
    const storageRef = ref(storage, storagePath);

    try {
      // Upload the PDF Blob to Firebase Storage
      await uploadBytes(storageRef, pdfBlob);
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      // Log the download URL
      return downloadURL;
    } catch (error) {
      utilityFunctions.ErrorNotify(
        "An error occurred while uploading the document.",
      );
    }

    // setGst("");
  } catch (error) {
    console.log(error);
    alert("Failed to generate Invoice PDF");
  }
}

export default generate_GST_Invoice_PDF;
