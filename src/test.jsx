async function generate_Invoice_PDF() {
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
    const fullText1 = consignorLocation + "\n" + item.consigneephonenumber;
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
      doc.text(`Total: ${nettotal}.00 Rs`, 400, doc.lastAutoTable.finalY + 159);

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
  }