import JsBarcode from "jsbarcode";
import jsPDF from "jspdf";
import { useRef } from "react";

function SavePDF(
  FROM_NAME,
  FROM_PHONE_NUMBER,
  FROM_LOCATION,
  TO_NAME,
  TO_PHONE_NUMBER,
  TO_LOCATION,
  WEIGHT,
  CONTENT,
  AWBNUMBER
) {

  const barcodeRef = useRef(null);
  const staticAwbNumber = AWBNUMBER;
  const todayDate = new Date().toLocaleDateString();

 
}

export default SavePDF;

  // JsBarcode(barcodeRef.current, awbNumber, {
    //   format: "CODE128",
    //   displayValue: true,
    //   width: 2,
    //   height: 40,
    // });

    // const doc = new jsPDF();

    // // Add logo to the PDF (replace with your logo URL)
    // const logoUrl = "/shiphtlogo.png";
    // doc.addImage(logoUrl, "PNG", 150, 10, 40, 20);

    // // Title formatting
    // doc.setFontSize(20);
    // doc.setFont("helvetica", "bold");
    // doc.text("Express Service", 20, 30);

    // // Add today's date
    // doc.setFontSize(12);
    // doc.setFont("helvetica", "normal");
    // doc.text(`Date: ${todayDate}`, 20, 40);

    // // Draw a border around the form
    // doc.setLineWidth(0.5);
    // doc.rect(10, 50, 190, 160);

    // // From and To section
    // const xOffset = 20;
    // const yOffset = 60;
    // const sectionWidth = 85; // Width for each section
    // const verticalSpacing = 20;

    // // From section
    // doc.setFontSize(14);
    // doc.setFont("helvetica", "bold");
    // doc.text("From:", xOffset, yOffset);

    // doc.setFont("helvetica", "normal");
    // doc.setFontSize(12);

    // doc.text(`Name: ${data.Consignorname}`, xOffset, yOffset + 10);
    // doc.text(`Phone Number: ${data.Consignornumber}`, xOffset, yOffset + 20);
    // const fromLocationLines = doc.splitTextToSize(
    //   `Location: ${data.Consignorlocation}`,
    //   sectionWidth - 10
    // );
    // doc.text(fromLocationLines, xOffset, yOffset + 30);

    // // To section
    // doc.setFont("helvetica", "bold");
    // doc.text("To:", xOffset + sectionWidth, yOffset);

    // doc.setFont("helvetica", "normal");

    // doc.setFontSize(12);

    // doc.text(
    //   `Name: ${data.consigneename}`,
    //   xOffset + sectionWidth,
    //   yOffset + 10
    // );
    // doc.text(
    //   `Phone Number: ${data.consigneenumber}`,
    //   xOffset + sectionWidth,
    //   yOffset + 20
    // );
    // const toLocationLines = doc.splitTextToSize(
    //   `Location: ${data.consigneelocation}`,
    //   sectionWidth - 10
    // );
    // doc.text(toLocationLines, xOffset + sectionWidth, yOffset + 30);

    // // Add weight section
    // doc.setFont("helvetica", "bold");
    // doc.text("Weight (kg):", xOffset, yOffset + 50);
    // doc.setFont("helvetica", "normal");
    // doc.text(`${data.weight} kg`, xOffset + sectionWidth, yOffset + 50);

    // // Content section
    // doc.setFont("helvetica", "bold");
    // doc.text("Content:", xOffset, yOffset + 70);
    // const content = doc.splitTextToSize(data.Content, 160);
    // doc.setFont("helvetica", "normal");
    // doc.text(content, xOffset, yOffset + 80);

    // // Add barcode section
    // doc.setFont("helvetica", "bold");
    // doc.text(`AWB Number: ${awbNumber}`, xOffset, yOffset + 120);

    // const barcodeImage = barcodeRef.current.toDataURL();
    // doc.addImage(barcodeImage, "PNG", xOffset, yOffset + 130, 100, 30);
    // // Save the PDF
    // doc.save(`${data.Consignorname}-client-form.pdf`);

    // <canvas ref={barcodeRef} style={{ display: "none" }}></canvas>