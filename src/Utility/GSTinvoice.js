import jsPDF from "jspdf";
import "jspdf-autotable";

async function generate_GST_Invoice_PDF(
  item,
  awbNumber,
  costKg,
  discountCost,
  additionalcharges,
  gst
) {
  try {
    const actualWeight = item.actualWeight;
    const consignorname = item.consignorname;
    const consignorlocation = item.consignorlocation;
    const consignorphonenumber = item.consignorphonenumber;

    const subtotal = parseInt(costKg) * actualWeight;
    const nettotal = subtotal - parseInt(discountCost) + additionalcharges;
    const GST_COST = costKg * 0.18;
    const doc = new jsPDF("p", "pt");

    // Logo
    doc.setFontSize(20);
    doc.addImage("/shiphtlogo.png", "PNG", 40, 30, 180, 60);

    const maxWidth = 210;

    // Bill From
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    // doc.text("Receipt from:", 40, 140);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Shiphit", 40, 140);

    doc.setFont("helvetica", "normal");

    const address = `2C, Rajarajan Street, Main Rd, Navarathna Garden, 
Ekkatuthangal, Chennai, Tamil Nadu 600032`;
    const phoneNumber = `\n9159 688 688`;
    const splitTextFrom = doc.splitTextToSize(address + phoneNumber, maxWidth);
    doc.text(splitTextFrom, 40, 160);

    // Bill To
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 350, 140);
    doc.setFont("helvetica", "normal");
    doc.text(consignorname, 350, 160);

    const toText = consignorlocation + "\n" + consignorphonenumber;
    const splitTextTo = doc.splitTextToSize(toText, maxWidth);
    doc.text(splitTextTo, 350, 180);

    // Invoice Right Side Meta
    const pageWidth = doc.internal.pageSize.getWidth();
    const rightX = pageWidth - 40;

    doc.text(`Receipt Number: RCPT-${awbNumber}`, rightX, 40, {
      align: "right",
    });
    doc.text(`GST Number: ${gst}`, rightX, 61, {
      align: "right",
    });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, rightX, 81, {
      align: "right",
    });
    doc.setFont("helvetica", "bold");
    doc.text(`Total: ${nettotal}.00 Rs`, rightX, 100, { align: "right" });

    // Separator Line
    doc.line(40, 250, 570, 250);

    // Table
    doc.autoTable({
      startY: 270,
      head: [
        ["Country Name", "Mode", "Weight (KG)", "Cost/KG", "GST(18%)", "Total"],
      ],
      body: [
        [
          item.destination,
          item.service + " Service",
          actualWeight + " KG",
          `${parseInt(costKg - GST_COST)} Rs`,
          `${GST_COST}`,
          `${subtotal}.00 Rs`,
        ],
      ],
      theme: "grid",
      headStyles: {
        fillColor: [147, 51, 234],
        textColor: [255, 255, 255],
      },
      bodyStyles: { fontSize: 12 },
    });

    // Terms
    const tcStart = doc.lastAutoTable.finalY + 30;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Terms & Conditions:", 40, tcStart);

    // ↓ Reduce font size here
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const terms = `
* This invoice is only valid for ${actualWeight} KG.
* Shipments exceeding ${actualWeight} KG will attract additional costs.
* All shipments are subject to customs clearance only.
* Customs duty applicable (if any).`;

    const splitTC = doc.splitTextToSize(terms, 500);
    doc.text(splitTC, 40, tcStart + 20);

    // Summary
    const labelX = 330;
    const valueX = 460;
    let y = doc.lastAutoTable.finalY + 120;

    doc.setFont("helvetica", "bold");
    doc.text("Subtotal:", labelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${subtotal}.00 Rs`, valueX, y);
    y += 20;

    doc.setFont("helvetica", "bold");
    doc.text("Additional Charges:", labelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(`+ ${additionalcharges}.00 Rs`, valueX, y);
    y += 20;

    if (discountCost > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("Discount:", labelX, y);
      doc.setFont("helvetica", "normal");
      doc.text(`- ${discountCost}.00 Rs`, valueX, y);
      y += 20;
    }

    doc.setFont("helvetica", "bold");
    doc.text("Total:", labelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${nettotal}.00 Rs`, valueX, y);

    // Footer
    doc.setFontSize(10);
    doc.text(
      "Thank you for your business!",
      40,
      doc.internal.pageSize.height - 40
    );
    doc.text(
      "Contact: info@shiphit.in | +91 - 9159 688 688",
      40,
      doc.internal.pageSize.height - 28
    );

    // Save
    doc.save(`Receipt_${consignorname}.pdf`);
  } catch (error) {
    console.log(error);
    alert("Failed to generate Invoice PDF");
  }
}

export default generate_GST_Invoice_PDF;
