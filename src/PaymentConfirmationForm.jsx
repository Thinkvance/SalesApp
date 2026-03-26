import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase"; // Import storage from your Firebase config
import { Controller, useForm } from "react-hook-form";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  runTransaction,
  Timestamp,
} from "firebase/firestore";
import collectionName_BaseAwb from "./functions/collectionName";
import axios from "axios";
import jsPDF from "jspdf";
import utilityFunctions from "./Utility/utilityFunctions";
import Lottie from "lottie-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import DB from "./DB/DB";
import countryList from "./CountryDialCode.json";
import generate_GST_Invoice_PDF from "./Utility/GSTinvoice";
import shouldSendInvoice from "./Utility/shouldSendInvoice.jsx";
import getClientGSTNumber from "./Utility/getClientGSTNumber.js";
function PaymentConfirmationForm() {
  const [costKg, setcostKg] = useState(0);
  const { awbnumber } = useParams();
  const [details, setDetails] = useState(null);
  const [paymentProof, setPaymentProof] = useState(null);
  const [KycImage, setKycImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false); // State to control popup visibility
  const [showPopupForPayConfirm, setshowPopupForPayConfirm] = useState(false);
  const barcodeRef = useRef(null); // Ref for barcode generation
  const [paymentMode, setPaymentMode] = useState("");
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm();
  const navigate = useNavigate();
  const [animationData, setAnimationData] = useState(null);

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

  useEffect(() => {
    if (details?.discountCost != null) {
      setValue("discountCost", details?.discountCost); // Set value in React Hook Form
    }
  }, [details?.discountCost, setValue]);

  useEffect(() => {
    if (details?.additionalcharges != null) {
      setValue("additionalcharges", details?.additionalcharges); // Set value in React Hook Form
    }
  }, [details?.additionalcharges, setValue]);

  useEffect(() => {
    if (!awbnumber) return;

    setLoading(true); // Start loading state

    const q = query(
      collection(
        db,
        collectionName_BaseAwb.getCollection(
          JSON.parse(localStorage.getItem("LoginCredentials")).Location,
        ),
      ),
      where("awbNumber", "==", parseInt(awbnumber)),
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const userDetails = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setDetails(userDetails.length > 0 ? userDetails[0] : null);
        setLoading(false); // Stop loading when data is received
      },
      (error) => {
        utilityFunctions.ErrorNotify(
          "An error occurred while fetching data. Please try again later.",
        );
        setLoading(false); // Stop loading on error
      },
    );

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [awbnumber]); // Re-run when `awbnumber` changes

  const uploadFileToFirebase = async (file, folder) => {
    const storageRef = ref(storage, `${awbnumber}/${folder}/${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  };
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setPaymentProof(file);
    }
  };
  const handleKYCFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setKycImage(file);
    }
  };

  const getTodayDate = async () => {
    const now = new Date();

    // Convert to IST (Indian Standard Time)
    const istOffset = 5 * 60 + 30; // IST is UTC+5:30
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000; // Get the UTC time
    const istTime = new Date(utcTime + istOffset * 60000); // Adjust to IST time

    // Format the date
    const day = String(istTime.getDate()).padStart(2, "0");
    const month = String(istTime.getMonth() + 1).padStart(2, "0"); // Month is zero-indexed
    const year = istTime.getFullYear();

    // Format the time in 12-hour format
    let hours = istTime.getHours();
    const minutes = String(istTime.getMinutes()).padStart(2, "0");
    const seconds = String(istTime.getSeconds()).padStart(2, "0");
    const period = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // Convert to 12-hour format, with 12 for midnight and noon

    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds} ${period}`;
  };

  async function getNextReceiptNumber(franchise = "CHENNAI") {
    // Detect financial year
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    const startYear = month >= 4 ? year : year - 1;
    const endYear = startYear + 1;

    const financialYear = `${String(startYear).slice(2)}-${String(endYear).slice(2)}`;

    // Franchise code
    const franchiseCode = franchise.slice(0, 3).toUpperCase();

    // Document ID
    const docId = `${franchise}_${financialYear.replace("-", "_")}`;

    const counterRef = doc(db, "receiptCounter", docId);

    return await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);

      let current = 99; // start from 100

      if (counterDoc.exists()) {
        current = counterDoc.data().current || 99;
      }

      const newReceipt = current + 1;

      transaction.set(counterRef, { current: newReceipt }, { merge: true });

      const receiptNumber = `${franchiseCode}/${financialYear}/${newReceipt}`;

      return {
        receiptCounter: newReceipt,
        receiptNumber: receiptNumber,
      };
    });
  }

  async function getNextGSTInvoiceNumber(franchise = "CHENNAI") {
    // Detect financial year
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    const startYear = month >= 4 ? year : year - 1;
    const endYear = startYear + 1;

    const financialYear = `${String(startYear).slice(2)}-${String(endYear).slice(2)}`;

    // Franchise short code
    const franchiseCode = franchise.slice(0, 3).toUpperCase();

    // Document name
    const docId = `${franchise}_${financialYear.replace("-", "_")}`;

    const counterRef = doc(db, "GSTinvoiceCounter", docId);

    return await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);

      let current = 99; // start from 100 if document doesn't exist

      if (counterDoc.exists()) {
        current = counterDoc.data().current || 99;
      }

      const newInvoice = current + 1;

      transaction.set(counterRef, { current: newInvoice }, { merge: true });

      const invoiceNumber = `${franchiseCode}/${financialYear}/${newInvoice}`;

      return {
        invoiceCounter: newInvoice,
        invoiceNumber: invoiceNumber,
      };
    });
  }

  async function generate_Invoice_PDF(
    costKg,
    discountCost,
    additionalcharges,
    invoiceNumber,
  ) {
    const doc = new jsPDF("p", "pt");
    const subtotal = parseInt(costKg) * details.actualWeight;
    const nettotal = subtotal - parseInt(discountCost) + additionalcharges;
    const year = new Date().getFullYear();
    function formatFirebaseTimestamp(timestamp) {
      if (!timestamp) return "";

      const date = timestamp.toDate();

      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();

      return `${day}/${month}/${year}`;
    }

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

    doc.text(`Receipt Number: ${invoiceNumber}`, rightMargin, 40, {
      align: "right",
    });

    doc.text(
      `Pickup Booking Date: ${formatFirebaseTimestamp(details.pickupDatetime)}`,
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
      head: [["Country Name", "Mode", "Weight (KG)", "Cost/KG", "Amount"]],
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
• The estimated delivery date is subject to customs clearance at the destination.
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
• For important products, opt for insurance by declaring just 5% of the invoice value (available for Economy and Express services only) to receive full reimbursement.
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

    // Save the PDF as a Blob
    const pdfBlob = doc.output("blob");

    // Reference to Firebase Storage
    const storagePath = `${details.awbNumber}/receipt/Receipt${details.consignorname} .pdf`;
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
  }

  function getTruncatedURL(fullUrl) {
    const baseUrl =
      "https://firebasestorage.googleapis.com/v0/b/shiphitmobileapppickup-fb7e2.firebasestorage.app/o/";
    const truncatedResult = fullUrl.replace(baseUrl, "");
    return truncatedResult;
  }

  async function makePaymentNotify(
    docId,
    Payment_URL,
    discount,
    consignorphonenumber,
    consignorname,
    logisticCost,
    additionalcharges,
    awbNumber,
    Source,
    companyName,
  ) {
    try {
      // Select template based on Source

      const apiUrl = "https://public.doubletick.io/whatsapp/message/template";
      const authKey = "key_z6hIuLo8GC"; // Store this securely (e.g., in environment variables)
      // Message data
      const messageData = {
        messages: [
          {
            from: "+919600690881",
            to: `+91${consignorphonenumber}`,
            content: {
              language: "en",
              templateName: "paymentrequestedreceipt_final",
              templateData: {
                body: {
                  placeholders: [
                    String(consignorname),
                    String(
                      logisticCost + parseInt(additionalcharges) - discount,
                    ),
                  ],
                },
                buttons: [
                  {
                    type: "URL",
                    parameter: getTruncatedURL(Payment_URL),
                  },
                ],
              },
            },
          },
        ],
      };
      // API request headers
      const headers = {
        accept: "application/json",
        "content-type": "application/json",
        Authorization: authKey,
      };
      // Sending WhatsApp message
      const response = await axios.post(apiUrl, messageData, { headers });
      // Extract message status
      const messageStatus = response?.status === 200;
      // Update Firestore document
      const pickupRef = doc(db, DB.db_collection, docId);
      await updateDoc(pickupRef, { makePaymentNotified: messageStatus });
      // Success message
      // utilityFunctions.SuccessNotify(
      //   "Make Payment notification sent successfully.",
      // );
    } catch (error) {
      console.log("error", error);
      utilityFunctions.ErrorNotify(error.message);
    } finally {
    }
  }

  //Payment Request!
  const onSubmit = async (data) => {
    const temp =
      data.countrycode && data.consigneenumber1
        ? `${data.countrycode}${" "}${data.consigneenumber1}`
        : false;
    let consigneenumber1 = temp ? temp : details.consigneephonenumber;

    setSubmitLoading(true);
    try {
      if (!details) {
        throw new Error("User details not found");
      }
      const receiptNumber = await getNextReceiptNumber();

      const Payment_URL = await generate_Invoice_PDF(
        data.costKg,
        data.discountCost,
        data.additionalcharges,
        receiptNumber.receiptNumber,
      );

      const q = query(
        collection(
          db,
          collectionName_BaseAwb.getCollection(
            JSON.parse(localStorage.getItem("LoginCredentials")).Location,
          ),
        ),
        where("awbNumber", "==", parseInt(awbnumber)),
      );
      const querySnapshot = await getDocs(q);
      const logisticCost = parseInt(details?.actualWeight) * parseInt(costKg);
      let final_result = [];
      querySnapshot.forEach((doc) => {
        final_result.push({ id: doc.id, ...doc.data() });
      });
      const docRef = doc(
        db,
        collectionName_BaseAwb.getCollection(
          JSON.parse(localStorage.getItem("LoginCredentials")).Location,
        ),
        final_result[0].id,
      ); // db is your Firestore instance

      const updatedFields = {
        status: "PAYMENT REQUESTED",
        logisticCost:
          parseInt(logisticCost + data.additionalcharges) -
          parseInt(data.discountCost),
        discountCost: data.discountCost,
        // paymentProof: await uploadFileToFirebase(paymentProof, "PAYMENT PROOF"),
        KycImage:
          typeof details.KycImage === "string" &&
          details.KycImage.startsWith("http")
            ? details.KycImage
            : await uploadFileToFirebase(KycImage, "KYC"),
        // PaymentComfirmedDate: await getTodayDate(),
        consigneename: !data.consigneename1
          ? details.consigneename
          : data.consigneename1,
        consigneephonenumber: consigneenumber1,
        consigneelocation: !data.consigneelocation1
          ? details.consigneelocation
          : data.consigneelocation1,
        costKg: costKg,
        payment_Receipt_URL: Payment_URL,
        additionalcharges: data.additionalcharges,
        receiptNumber: receiptNumber.receiptNumber,
        receiptCounter: receiptNumber.receiptCounter,
      };
      updateDoc(docRef, updatedFields);
      await makePaymentNotify(
        details.id,
        Payment_URL,
        data.discountCost,
        details.consignorphonenumber,
        details.consignorname,
        logisticCost,
        data.additionalcharges,
        details.awbNumber,
        details.Source,
        details.companyName,
      );
      setShowPopup(true);
    } catch (error) {
      console.log(error);
      handleError(error);
    } finally {
      setSubmitLoading(false);
      resetForm(); // Reset form after submission
    }
  };

  const paymentConfirm = async () => {
    const validateForm = () => {
      if (!paymentMode) {
        setFormError("paymentMode");
        return;
      }
      if (!paymentProof) {
        setFormError("Payment proof Image is required.");
        return false;
      }
      setFormError("");
      return true;
    };
    if (!validateForm()) return;
    setSubmitLoading(true);
    try {
      if (!details) {
        throw new Error("User details not found");
      }
      setSubmitLoading(true);

      const isInvoice = shouldSendInvoice(paymentMode);

      let Payment_gst_URL = null;
      let gstInvoiceNumber = null;

      if (isInvoice) {
        const gstNumber = await getClientGSTNumber(details.companyName);

        // Increment ONLY for GST invoice
        gstInvoiceNumber = await getNextGSTInvoiceNumber();

        Payment_gst_URL = await generate_GST_Invoice_PDF(
          details,
          details.awbNumber,
          details.costKg,
          details.discountCost,
          details.additionalcharges,
          gstNumber,
          details.pickupDatetime,
          gstInvoiceNumber.invoiceNumber, // pass invoice number
        );
      }

      const Payment_URL = isInvoice
        ? Payment_gst_URL
        : details.payment_Receipt_URL;

      const template = isInvoice
        ? "payment_completed_final_gst_invoice"
        : "payment_completed_final";

      const q = query(
        collection(
          db,
          collectionName_BaseAwb.getCollection(
            JSON.parse(localStorage.getItem("LoginCredentials")).Location,
          ),
        ),
        where("awbNumber", "==", parseInt(awbnumber)),
      );
      const querySnapshot = await getDocs(q);
      let final_result = [];
      querySnapshot.forEach((doc) => {
        final_result.push({ id: doc.id, ...doc.data() });
      });
      const docRef = doc(
        db,
        collectionName_BaseAwb.getCollection(
          JSON.parse(localStorage.getItem("LoginCredentials")).Location,
        ),
        final_result[0].id,
      );

      const now = Timestamp.now();

      const updatedInternalTracking = details.internalTracking.map((step) => {
        if (step.code === "PAYMENT_RECEIVED") {
          return {
            ...step,
            status: "COMPLETED",
            datetime: now,
            updatedAt: now,
            updatedBy: "system",
            notes: "Payment received successfully",
          };
        }

        return step;
      });

      const updatedFields = {
        gstInvoiceCounter: gstInvoiceNumber
          ? gstInvoiceNumber.invoiceCounter
          : null,
        gstInvoiceNumber: gstInvoiceNumber
          ? gstInvoiceNumber.invoiceNumber
          : null,
        paymentMode: paymentMode,
        payment_Invoice_URL: Payment_gst_URL,
        status: "PAYMENT DONE",
        paymentProof: await uploadFileToFirebase(paymentProof, "PAYMENT PROOF"),
        PaymentComfirmedDate: await getTodayDate(),
      };

      await updateDoc(docRef, {
        ...updatedFields,
        internalTracking: updatedInternalTracking,
      });

      try {
        const options = {
          method: "POST",
          url: "https://public.doubletick.io/whatsapp/message/template",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            Authorization: "key_z6hIuLo8GC",
          },
          data: {
            messages: [
              {
                content: {
                  language: "en",
                  templateData: {
                    body: {
                      placeholders: [
                        String(details.consignorname),
                        String(details.logisticCost),
                        String(details.awbNumber),
                      ],
                    },
                    buttons: [
                      {
                        type: "URL",
                        parameter: getTruncatedURL(Payment_URL),
                      },
                      {
                        type: "URL",
                        parameter: String(details.awbHashedValue),
                      },
                    ],
                  },
                  templateName: template,
                },
                from: "+919600690881",
                to: `+91${details.consignorphonenumber}`,
              },
            ],
          },
        };
        const response = await axios.post(options.url, options.data, {
          headers: options.headers,
        });
      } catch (error) {
        console.log("error", error.message);
      }
      setshowPopupForPayConfirm(true);
    } catch (error) {
      console.log("error", error);
      handleError(error);
    } finally {
      setSubmitLoading(false);
      resetForm(); // Reset form after submission
    }
  };

  const handleError = (error) => {
    if (error.response) {
      // Handle server response error
      utilityFunctions.ErrorNotify(
        "An error occurred while processing your request.",
      );
    } else if (error.request) {
      // Handle no response from the server
      utilityFunctions.ErrorNotify(
        "Unable to connect. Please check your network.",
      );
    } else {
      // Handle other types of errors
      utilityFunctions.ErrorNotify("An unexpected error occurred.");
    }
  };

  useEffect(() => {
    const country = countryList.find((c) => c.name === details?.destination);
    if (country) {
      setValue("countrycode", country.dialCode);
    }
  }, [details]);

  const resetForm = () => {
    setPaymentProof(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div
          className="spinner-border animate-spin inline-block w-12 h-12 border-4 rounded-full text-purple-600"
          role="status"
        >
          <span className="visually-hidden">...</span>
        </div>
      </div>
    );
  }

  // if (error) {
  //   return <div className="text-red-500 text-center p-4">{error}</div>;
  // }

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white shadow-md rounded-lg">
      {details ? (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-gray-50 p-4 rounded-lg shadow-sm"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Payment Confirmation
          </h2>
          {/* Back Button */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-4 py-2 px-4 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 focus:outline-none"
          >
            Back
          </button>
          <div className="flex flex-col mb-4">
            <label className="text-gray-700 font-medium mb-1">
              Consignor Name:
            </label>
            <p>{details.consignorname}</p>
          </div>
          <div className="flex flex-col mb-4">
            <label className="text-gray-700 font-medium mb-1">
              Consignor Phone Number:
            </label>
            <input
              type="text"
              value={details.consignorphonenumber}
              readOnly
              className="p-2 border rounded bg-gray-100"
            />
          </div>
          {/* TO */}
          <div className="flex flex-col mb-4">
            <label className="text-gray-700 font-medium mb-1">
              From Address:
            </label>
            <input
              type="text"
              value={details.consignorlocation}
              readOnly
              className="p-2 border rounded bg-gray-100"
            />
          </div>
          {/* consignee data */}
          {details.consigneename ? (
            <div className="flex flex-col mb-4">
              <label className="text-gray-700 font-medium mb-1">
                Consignee Name:
              </label>
              <input
                type="text"
                value={details.consigneename}
                readOnly
                className="p-2 border rounded bg-gray-100"
              />
            </div>
          ) : (
            ""
          )}
          {details.consigneephonenumber ? (
            <div className="flex flex-col mb-4">
              <label className="text-gray-700 font-medium mb-1">
                Consignee Phone Number:
              </label>
              <input
                type="text"
                value={details.consigneephonenumber}
                readOnly
                className="p-2 border rounded bg-gray-100"
              />
            </div>
          ) : (
            ""
          )}
          {details.consigneelocation ? (
            <div className="flex flex-col mb-4">
              <label className="text-gray-700 font-medium mb-1">
                Consignor Address:
              </label>
              <input
                type="text"
                value={details.consigneelocation}
                readOnly
                className="p-2 border rounded bg-gray-100"
              />
            </div>
          ) : (
            ""
          )}
          <div className="flex flex-col mb-4">
            <label className="text-gray-700 font-medium mb-1">
              Destination:
            </label>
            <input
              type="text"
              value={details.destination}
              readOnly
              className="p-2 border rounded bg-gray-100"
            />
          </div>
          <div className="flex flex-col mb-4">
            <label className="text-gray-700 font-medium mb-1">
              Actual Weight:
            </label>
            <input
              type="text"
              value={details.actualWeight + " " + "KG"}
              readOnly
              className="p-2 border rounded bg-gray-100"
            />
          </div>
          <div className="flex flex-col mb-4">
            <label className="text-gray-700 font-medium mb-1">
              PickUp Person Name:
            </label>
            <input
              type="text"
              value={details.pickUpPersonName}
              readOnly
              className="p-2 border rounded bg-gray-100"
            />
          </div>
          <div className="flex flex-col mb-4">
            <label className="text-gray-700 font-medium mb-1">
              Shiphit AWB Number:
            </label>
            <input
              type="text"
              value={awbnumber}
              readOnly
              className="p-2 border rounded bg-gray-100"
            />
          </div>
          <div className="flex flex-col mb-4">
            <label className="text-gray-700 font-medium mb-1">
              Pickup Completed Datatime
            </label>
            <input
              type="text"
              value={details.pickupCompletedDatatime}
              readOnly
              className="p-2 border rounded bg-gray-100"
            />
          </div>

          {/* consignee data */}
          {details.consigneename == "" ? (
            <>
              <div className="flex flex-col mb-2">
                <label className="text-gray-700 font-medium mb-1">
                  Consignee Name:
                </label>
                <input
                  type="text"
                  placeholder="Enter Consignee Name"
                  className="p-2 border rounded bg-gray-100"
                  {...register("consigneename1", {
                    required: "Consignee name is required",
                  })}
                />
              </div>
              {errors.consigneename1 && (
                <p className="text-red-500 text-sm mb-4">
                  {errors.consigneename1.message}
                </p>
              )}
            </>
          ) : (
            ""
          )}
          {/* consigneenumber1 */}
          {details.consigneephonenumber == "" ? (
            <div className="flex flex-col">
              <label className="block text-gray-700 font-semibold mb-2">
                Consignee Phone Number
              </label>
              <div className="flex flex-row">
                <div className="mb-4">
                  <Controller
                    name="countrycode"
                    control={control}
                    render={({ field }) => (
                      <PhoneInput
                        enableSearch
                        value={field.value}
                        onChange={(value) => field.onChange(value)}
                        inputStyle={{
                          width: "108px",
                          height: "42px",
                          borderColor: errors.countrycode
                            ? "#f87171"
                            : "#d1d5db",
                          borderRadius: "0.375rem",
                          fontSize: "1rem",
                        }}
                        inputProps={{
                          readOnly: true,
                          disabled: true,
                        }}
                        buttonStyle={{
                          pointerEvents: "none", // disables flag click
                          backgroundColor: "#f3f4f6",
                          cursor: "not-allowed",
                        }}
                        specialLabel=""
                      />
                    )}
                  />
                  {errors.countrycode && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.countrycode.message}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Enter number without country code"
                    {...register("consigneenumber1", {
                      required: "Enter consignee phone number",
                      pattern: {
                        value: /^[0-9]+$/,
                        message: "Only digits are allowed",
                      },
                      minLength: {
                        value: 6,
                        message: "Must be at least 6 digits",
                      },
                      maxLength: {
                        value: 15,
                        message: "Must be at most 15 digits",
                      },
                    })}
                    className={`w-full border rounded-md ml-6 pl-2 py-2 ${
                      errors.consigneenumber1
                        ? "border-red-500"
                        : "border-gray-400"
                    }`}
                  />
                  {errors.consigneenumber1 && (
                    <p className="text-red-500 ml-6 mt-1 text-sm">
                      {errors.consigneenumber1.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            ""
          )}
          {details.consigneelocation == "" ? (
            <>
              <div className="flex flex-col mb-2">
                <label className="text-gray-700 font-medium mb-1">
                  Consignee Address:
                </label>
                <input
                  {...register("consigneelocation1", {
                    required: "Consignee location required",
                  })}
                  type="text"
                  placeholder="Enter Consignee Address"
                  className="p-2 border rounded bg-gray-100"
                />
              </div>
              {errors.consigneelocation1 && (
                <p className="text-red-500 text-sm mb-4">
                  {errors.consigneelocation1.message}
                </p>
              )}
            </>
          ) : (
            ""
          )}

          <div className="flex flex-col mb-1">
            <label className="text-gray-700 font-medium mb-1">
              Enter Logistics Cost
            </label>
            <input
              value={
                details?.logisticCost
                  ? details?.logisticCost
                  : parseInt(details?.actualWeight) * costKg
              }
              type="text"
              className="p-2 border rounded bg-gray-100"
              placeholder="Enter Logistic Cost"
              readOnly={!!details.logisticCost} // Makes input readonly if discountCost exists
              {...register("logisticsCost", {
                required: "Logistics cost is required",
                pattern: {
                  value: /^[0-9]+$/,
                  message:
                    "Please enter a valid phone number consisting of digits only",
                },
                valueAsNumber: true, // Converts input value to an integer
                validate: (value) =>
                  Number.isInteger(value) ||
                  "Please enter a valid integer number",
              })}
            />
          </div>
          {errors.logisticsCost && (
            <p className="text-red-500 text-sm mb-4">
              {errors.logisticsCost.message}
            </p>
          )}
          <div className="flex flex-col mt-3 mb-3">
            <label className="text-gray-700 font-medium mb-1">Cost/KG</label>
            <input
              type="text"
              value={details.costKg == null ? costKg : details.costKg}
              className="p-2 border rounded bg-gray-100"
              placeholder="Enter Cost/KG"
              readOnly={details.costKg == null ? false : true} // Makes input readonly if discountCost exists
              {...register("costKg", {
                required: "Cost/KG is required",
                pattern: {
                  value: /^[0-9]+$/,
                  message: "Please enter a Cost/KG consisting of digits only",
                },
                validate: (value) =>
                  Number.isInteger(Number(value)) ||
                  "Please enter a valid integer",
              })}
              onChange={(e) => {
                const value = e.target.value;
                if (/^\d*\.?\d*$/.test(value)) {
                  setcostKg(Number(value));
                }
              }}
            />
          </div>
          {errors.costKg && (
            <p className="text-red-500 text-sm mb-4">{errors.costKg.message}</p>
          )}
          <div className="flex flex-col mb-1">
            <label className="text-gray-700 font-medium mb-1">
              Enter Discount Amount
            </label>
            <input
              type="text"
              className="p-2 border rounded bg-gray-100"
              placeholder="Enter Discount Amount"
              readOnly={details.discountCost == undefined ? false : true}
              {...register("discountCost", {
                required: "Please enter the discount amount.",
                pattern: {
                  value: /^[0-9]+$/,
                  message:
                    "Please enter a valid discount number consisting of digits only.",
                },
                valueAsNumber: true, // Converts input value to an integer
                validate: (value) =>
                  Number.isInteger(value) ||
                  "Please enter a valid integer number",
              })}
            />
          </div>
          {errors.discountCost && (
            <p className="text-red-500 text-sm mb-4">
              {errors.discountCost.message}
            </p>
          )}
          <div className="flex flex-col mb-1">
            <label className="text-gray-700 font-medium mb-1">
              Enter Additional Charges If Any
            </label>
            <input
              type="text"
              className="p-2 border rounded bg-gray-100"
              placeholder="Enter 0  or Ex: 100"
              readOnly={details.additionalcharges == undefined ? false : true}
              {...register("additionalcharges", {
                required:
                  "Please enter any additional charges, or enter 0 if none.",
                pattern: {
                  value: /^[0-9]+$/,
                  message:
                    "Please enter a valid additional charges number consisting of digits only.",
                },
                valueAsNumber: true, // Converts input value to an integer
                validate: (value) =>
                  Number.isInteger(value) ||
                  "Please enter a valid integer number",
              })}
            />
          </div>
          {errors.additionalcharges && (
            <p className="text-red-500 text-sm mb-4">
              {errors.additionalcharges.message}
            </p>
          )}

          {details.status == "PAYMENT REQUESTED" ? (
            <div className="flex flex-col mb-4">
              <label className="text-gray-700 font-medium mb-1">
                Select Payment Mode
              </label>
              <select
                className="p-2  border rounded bg-gray-100"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
              >
                <option value="">Select Option</option>
                <option value="Cash">Cash</option>
                <option value="Credit/Debit Cards">Credit/Debit Cards</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>

              {formError === "paymentMode" && (
                <p className="text-red-500 text-sm mt-2">
                  Please select a payment mode!
                </p>
              )}
            </div>
          ) : (
            ""
          )}

          {details.makePaymentNotified ? (
            <>
              <div className="flex flex-col mb-4">
                <label className="text-gray-700 font-medium mb-1">
                  Payment Proof:
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="p-2 border rounded"
                  required
                />
              </div>
              {errors.Paymentproof && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.Paymentproof.message}
                </p>
              )}
            </>
          ) : (
            ""
          )}
          {details.KycImage == null || details.KycImage == "" ? (
            <>
              <div className="flex flex-col mb-4">
                <label className="text-gray-700 font-medium mb-1">
                  Upload KYC
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleKYCFileChange}
                  className="p-2 border rounded"
                  required
                />
              </div>
              {errors.KYCimage && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.KYCimage.message}
                </p>
              )}
            </>
          ) : (
            <></>
          )}
          {formError && <p className="text-red-500 text-sm">{formError}</p>}
          {details.makePaymentNotified &&
          details.status == "PAYMENT REQUESTED" ? (
            <div
              onClick={() => paymentConfirm()}
              className="w-full mt-4 p-2 text-center cursor-pointer bg-purple-600 text-white font-semibold rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-600"
              // disabled={submitLoading}
            >
              {submitLoading ? "Submitting..." : "Submit"}
            </div>
          ) : (
            <button
              type="submit"
              className="w-full mt-4 p-2 flex items-center justify-center bg-purple-600 text-white font-semibold rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-600"
              disabled={submitLoading}
            >
              {submitLoading ? (
                <Lottie
                  animationData={animationData}
                  loop={true}
                  className="w-8 h-8"
                />
              ) : (
                "Get Payment"
              )}
            </button>
          )}
        </form>
      ) : (
        <div className="text-center text-gray-500">
          No details found for the given AWB number.
        </div>
      )}
      {showPopup && (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-70">
          <div className="bg-white p-8 rounded-lg shadow-lg transition-transform transform scale-95 hover:scale-100 duration-300">
            <h3 className="text-xl font-bold text-center text-gray-800 mb-6">
              Payment Requested
            </h3>
            <p className="text-center text-gray-600 mb-4">
              Thank you! Your payment request has been sent.
            </p>
            <button
              className="mt-4 w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition duration-200"
              onClick={() => {
                setShowPopup(false);
                // navigate("/Payment-confirm");
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
      {showPopupForPayConfirm && (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-70">
          <div className="bg-white p-8 rounded-lg shadow-lg transition-transform transform scale-95 hover:scale-100 duration-300">
            <h3 className="text-xl font-bold text-center text-gray-800 mb-6">
              Payment Completed
            </h3>
            <p className="text-center text-gray-600 mb-4">
              Thank you! Your payment has been successfully completed.
            </p>
            <button
              className="mt-4 w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition duration-200"
              onClick={() => {
                setshowPopupForPayConfirm(false);
                navigate("/Payment-confirm");
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
      {/* Hidden canvas for generating barcode */}
      <canvas ref={barcodeRef} style={{ display: "none" }} />
    </div>
  );
}
export default PaymentConfirmationForm;
