import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase"; // Import storage from your Firebase config
import { Controller, useFieldArray, useForm } from "react-hook-form";
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
  writeBatch,
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
import {
  fetchLowestRate,
  getWeightSlab,
  getActualWeightSlab,
  getFlatSlabKg,
  normaliseService,
} from "./Utility/fetchLowestRate.js";

function PaymentConfirmationForm() {
  const [costKg, setcostKg] = useState(0);
  const { awbnumber } = useParams();
  const [details, setDetails] = useState(null);
  const [paymentProof, setPaymentProof] = useState([]);
  const [KycImage, setKycImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false); // State to control popup visibility
  const [showPopupForPayConfirm, setshowPopupForPayConfirm] = useState(false);
  const [showGetPaymentConfirm, setShowGetPaymentConfirm] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [costKgAutoPopulated, setCostKgAutoPopulated] = useState(false);
  const [rateCardAmount, setRateCardAmount] = useState(null);
  const [rateCardCostPerKg, setRateCardCostPerKg] = useState(null);
  const [dutyFreeUpsold, setDutyFreeUpsold] = useState(false);
  const barcodeRef = useRef(null); // Ref for barcode generation
  const [paymentMode, setPaymentMode] = useState("");
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      additionalChargesList: [{ amount: "", reason: "" }],
    },
  });
  const {
    fields: chargeFields,
    append: appendCharge,
    remove: removeCharge,
  } = useFieldArray({ control, name: "additionalChargesList" });
  const watchChargesList = watch("additionalChargesList") || [];
  const totalAdditionalCharges = watchChargesList.reduce(
    (sum, row) => sum + (parseInt(row?.amount) || 0),
    0,
  );
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
    if (
      details?.additionalChargesList &&
      Array.isArray(details.additionalChargesList) &&
      details.additionalChargesList.length
    ) {
      setValue("additionalChargesList", details.additionalChargesList);
    } else if (
      details?.additionalcharges != null &&
      details.additionalcharges > 0
    ) {
      setValue("additionalChargesList", [
        {
          amount: String(details.additionalcharges),
          reason: details.additionalChargeReason || "",
        },
      ]);
    }
  }, [
    details?.additionalcharges,
    details?.additionalChargeReason,
    details?.additionalChargesList,
    setValue,
  ]);

  useEffect(() => {
    if (details?.costKg != null) {
      setValue("costKg", details.costKg);
      setcostKg(Number(details.costKg));
    }
  }, [details?.costKg, setValue]);

  const furtherDiscountWatch = watch("furtherDiscount");
  const watchDiscount = watch("discountCost");
  const watchAdditional = totalAdditionalCharges;

  // Keep logisticsCost form value in sync with the computed value.
  // Uses rate-card as the base when available so the combined discountCost
  // (rate-card gap + further) subtracts cleanly to sales − further.
  useEffect(() => {
    if (!details) return;
    const weight = parseInt(details?.actualWeight) || 0;
    const liveCostKg = Number(costKg) || 0;
    const liveDiscount = parseInt(watchDiscount) || 0;
    const liveAdditional = parseInt(watchAdditional) || 0;
    const salesLogistics = weight * liveCostKg;
    const baseLogistics =
      rateCardAmount != null && rateCardAmount > salesLogistics
        ? rateCardAmount
        : salesLogistics;
    const finalLogistics = details?.logisticCost
      ? details.logisticCost
      : baseLogistics + liveAdditional - liveDiscount;
    setValue("logisticsCost", finalLogistics);
  }, [
    details,
    costKg,
    watchDiscount,
    watchAdditional,
    rateCardAmount,
    setValue,
  ]);

  // For B To C, set default discount/recovered to 0 (no auto-fill from rate card)
  useEffect(() => {
    if (details?.Source !== "B To C") return;
    if (details?.discountCost == null) {
      setValue("discountCost", 0);
    }
    if (details?.recoverdCost == null) {
      setValue("recoverdCost", 0);
    }
  }, [details?.Source, details?.discountCost, details?.recoverdCost, setValue]);

  // Auto-fill Discount Amount and Recovered Cost based on rate card vs sales price.
  // discountCost = (rate-card − sales) + further. Downstream totals start from
  // the rate-card base so subtracting this combined discount lands at
  // sales − further (no double-discount).
  useEffect(() => {
    if (rateCardAmount == null || !costKg) return;
    if (details?.Source === "B To C") return;
    const salesLogistics = parseInt(details?.actualWeight) * costKg;
    const diff = rateCardAmount - salesLogistics;
    const baseDiscount = diff > 0 ? diff : 0;
    const autoRecovered = diff < 0 ? Math.abs(diff) : 0;
    const further = parseInt(furtherDiscountWatch) || 0;
    if (details?.discountCost == null) {
      setValue("discountCost", baseDiscount + further);
    }
    if (details?.recoverdCost == null) {
      setValue("recoverdCost", autoRecovered);
    }
  }, [
    rateCardAmount,
    costKg,
    details?.actualWeight,
    details?.discountCost,
    details?.recoverdCost,
    furtherDiscountWatch,
    setValue,
  ]);

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
    const newFiles = Array.from(event.target.files);
    const combined = [...paymentProof, ...newFiles];
    if (combined.length > 2) {
      utilityFunctions.ErrorNotify("You can upload a maximum of 2 images.");
      event.target.value = "";
      return;
    }
    setPaymentProof(combined);
    event.target.value = "";
  };
  const removePaymentProof = (index) => {
    setPaymentProof((prev) => prev.filter((_, i) => i !== index));
  };
  const handleKYCFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setKycImage(file);
    }
    event.target.value = "";
  };
  const removeKycImage = () => {
    setKycImage("");
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
    chargesList,
    paymentRequestedDate,
    isPaymentDone = false,
    baseLogistics = null,
    baseCostPerKg = null,
  ) {
    const doc = new jsPDF("p", "pt");
    const salesSubtotal = parseInt(costKg) * details.actualWeight;
    const subtotal =
      baseLogistics != null && baseLogistics > salesSubtotal
        ? baseLogistics
        : salesSubtotal;
    const displayCostKg =
      baseCostPerKg != null && subtotal > salesSubtotal
        ? baseCostPerKg
        : costKg;
    const nettotal = subtotal - parseInt(discountCost) + additionalcharges;
    const normalisedCharges =
      Array.isArray(chargesList) && chargesList.length
        ? chargesList
        : additionalcharges > 0
          ? [{ amount: additionalcharges, reason: "Additional Charges" }]
          : [];
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

    doc.setFont("helvetica", "bold");
    doc.text(
      "Receipt Number: ",
      rightMargin - doc.getTextWidth(invoiceNumber),
      40,
      {
        align: "right",
      },
    );
    doc.setFont("helvetica", "normal");
    doc.text(invoiceNumber, rightMargin, 40, {
      align: "right",
    });

    doc.setFont("helvetica", "bold");
    const dateStr = formatFirebaseTimestamp(paymentRequestedDate);
    doc.text("Date: ", rightMargin - doc.getTextWidth(dateStr), 60, {
      align: "right",
    });
    doc.setFont("helvetica", "normal");
    doc.text(dateStr, rightMargin, 60, {
      align: "right",
    });

    doc.setFont("helvetica", "bold");
    const awbStr = String(details.awbNumber || awbnumber);
    doc.text("AWB Number: ", rightMargin - doc.getTextWidth(awbStr), 80, {
      align: "right",
    });
    doc.setFont("helvetica", "normal");
    doc.text(awbStr, rightMargin, 80, {
      align: "right",
    });

    const totalLabel = isPaymentDone ? "Total" : "Total To Pay";
    const totalStr = `${nettotal}.00 Rs`;
    doc.setFont("helvetica", "bold");
    doc.text(`${totalLabel}: `, rightMargin - doc.getTextWidth(totalStr), 100, {
      align: "right",
    });
    doc.setFont("helvetica", "normal");
    doc.text(totalStr, rightMargin, 100, {
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
          `${displayCostKg} Rs`,
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
    const labelX = 300;
    const valueX = 490;
    let currentY = doc.lastAutoTable.finalY + 40;

    // Subtotal
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Subtotal:", labelX, currentY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(`${subtotal}.00 Rs`, valueX, currentY);
    currentY += 20;

    // Additional Charges (one line per entry)
    normalisedCharges.forEach((row) => {
      if (!row || !(row.amount > 0)) return;
      if (currentY > doc.internal.pageSize.height - 80) {
        doc.addPage();
        currentY = 60;
      }
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      const chargeLabel = row.reason || "Additional Charges";
      doc.text(chargeLabel, labelX, currentY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(`+ ${Number(row.amount).toFixed(2)} Rs`, valueX, currentY);
      currentY += 20;
    });

    // Discount
    if (discountCost > 0) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Discount:", labelX, currentY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 128, 0);
      doc.text(`- ${discountCost}.00 Rs`, valueX, currentY);
      currentY += 20;
    }

    // Separator line above Total
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(labelX, currentY - 14, valueX + 60, currentY - 14);

    // Total
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Total:", labelX, currentY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(`${nettotal}.00 Rs`, valueX, currentY);

    doc.setTextColor(0, 0, 0);

    // -------------------------
    // Terms & Conditions + Policy (paginated)
    // -------------------------
    const pageHeight = doc.internal.pageSize.height;
    const footerReserve = 70;
    const bodyLineHeight = 14;
    const headingLineHeight = 20;

    let sectionY = currentY + 30;

    const ensureSpace = (needed) => {
      if (sectionY + needed > pageHeight - footerReserve) {
        doc.addPage();
        sectionY = 50;
      }
    };

    const drawHeading = (text) => {
      ensureSpace(headingLineHeight);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text(text, 40, sectionY);
      sectionY += headingLineHeight;
    };

    const drawParagraph = (text) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const lines = doc.splitTextToSize(text, 520);
      lines.forEach((line) => {
        ensureSpace(bodyLineHeight);
        doc.text(line, 40, sectionY);
        sectionY += bodyLineHeight;
      });
    };

    drawHeading("Terms & Conditions");
    drawParagraph(
      `• This invoice is only valid for ${details.actualWeight} Kg.\n• The estimated delivery date is subject to customs clearance at the destination.`,
    );

    sectionY += 8;
    drawHeading("Cancellation & Refund Policy");
    drawParagraph(
      `We strive to meet our commitments in terms of service and in case of failure to do so, we will work with customers on a case-to-case basis to sort the issue.\n\nOur Cancellation Policy:\n• Customers can cancel the order before shipment is handed over (typically before 8 PM same day after confirmation/payment).\n• Once handed over by end of day, cancellations cannot be entertained.\n\nOur Refund Policy:\n• Refunds are entertained only for damage or delays within our control.\n• Refunds apply only if packing was done by ShipHit without customer weight reduction request.\n• No refunds for fragile/delicate shipments sent via duty free/Self mode.\n• Damage must be reported within 48 hours of delivery.\n• No refunds for delay/abandonment due to customs clearance.\n• In case of loss, refund includes logistics cost and max product value $100 or declared invoice value (whichever is lower).\n• For important products, opt for insurance by declaring just 5% of the invoice value (available for Economy and Express services only) to receive full reimbursement.\n• For refund assessment within 3 business days submit damage pictures and packaging proof.\n• Maximum refund limited to declared damaged item value.\n• Refund processed via wallet credit note or bank transfer within 7 working days.`,
    );

    // -------------------------
    // Footer on every page
    // -------------------------
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("Thank you for your business!", 40, pageHeight - 40);
      doc.text(
        "Company Contact Info: info@shiphit.com | +91 - 9159 688 688",
        40,
        pageHeight - 25,
      );
    }

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

      const chargesList = (data.additionalChargesList || [])
        .map((row) => ({
          amount: parseInt(row?.amount) || 0,
          reason: row?.reason || "",
        }))
        .filter((row) => row.amount > 0);
      const additionalChargesSum = chargesList.reduce(
        (s, r) => s + r.amount,
        0,
      );

      const paymentRequestedDate = Timestamp.now();

      const Payment_URL = await generate_Invoice_PDF(
        data.costKg,
        data.discountCost,
        additionalChargesSum,
        receiptNumber.receiptNumber,
        chargesList,
        paymentRequestedDate,
        false,
        rateCardAmount,
        rateCardCostPerKg,
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
      const salesLogistics = parseInt(details?.actualWeight) * parseInt(costKg);
      // Use rate-card as the base when available; discountCost already
      // includes the rate-card gap, so subtracting it below nets to
      // sales − further (the correct client-pay amount).
      const logisticCost =
        rateCardAmount != null && rateCardAmount > salesLogistics
          ? rateCardAmount
          : salesLogistics;
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
        paymentRequestedDate: paymentRequestedDate,
        logisticCost:
          parseInt(logisticCost + additionalChargesSum) -
          parseInt(data.discountCost),
        discountCost: data.discountCost,
        recoverdCost: data.recoverdCost || 0,
        KycImage:
          typeof details.KycImage === "string" &&
          details.KycImage.startsWith("http")
            ? details.KycImage
            : await uploadFileToFirebase(KycImage, "KYC"),
        consigneename: !data.consigneename1
          ? details.consigneename
          : data.consigneename1,
        consigneephonenumber: consigneenumber1,
        consigneelocation: !data.consigneelocation1
          ? details.consigneelocation
          : data.consigneelocation1,
        costKg: costKg,
        payment_Receipt_URL: Payment_URL,
        additionalcharges: additionalChargesSum,
        additionalChargeReason: chargesList[0]?.reason || null,
        additionalChargesList: chargesList,
        receiptNumber: receiptNumber.receiptNumber,
        receiptCounter: receiptNumber.receiptCounter,
      };
      // Atomic commit: pickup update + agent discount stats either both
      // land or neither does. Prevents half-cooked state if the network
      // drops between the two writes.
      const batch = writeBatch(db);
      batch.update(docRef, updatedFields);

      await batch.commit();

      await makePaymentNotify(
        details.id,
        Payment_URL,
        data.discountCost,
        details.consignorphonenumber,
        details.consignorname,
        logisticCost,
        additionalChargesSum,
        details.awbNumber,
        details.Source,
        details.companyName,
      );
      setShowPopup(true);
      resetForm(); // Only reset on success — preserve input on failure so user can retry
    } catch (error) {
      console.log(error);
      handleError(error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const paymentConfirm = async () => {
    const validateForm = () => {
      if (!paymentMode) {
        setFormError("paymentMode");
        return;
      }
      if (!paymentProof || paymentProof.length === 0) {
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
      const now = Timestamp.now();

      // Derive the rate-card base from stored fields so regenerated
      // invoices/receipts match what the client originally received.
      // logisticCost stored = base + additional − discount  ⇒  base = logisticCost + discount − additional
      const storedAdditional = parseInt(details.additionalcharges) || 0;
      const storedDiscount = parseInt(details.discountCost) || 0;
      const storedTotal = parseInt(details.logisticCost) || 0;
      const derivedBase = storedTotal + storedDiscount - storedAdditional;
      const storedSales =
        parseInt(details.actualWeight) * parseInt(details.costKg);
      const regenBaseLogistics = derivedBase > storedSales ? derivedBase : null;
      const regenBaseCostPerKg =
        regenBaseLogistics != null && parseInt(details.actualWeight) > 0
          ? Math.round(regenBaseLogistics / parseInt(details.actualWeight))
          : null;

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
          gstNumber,
          now,
          gstInvoiceNumber.invoiceNumber,
          Array.isArray(details.additionalChargesList)
            ? details.additionalChargesList
            : [],
          regenBaseCostPerKg,
        );
      }

      const Payment_Receipt_Regenerated = isInvoice
        ? null
        : await generate_Invoice_PDF(
            details.costKg,
            details.discountCost,
            details.additionalcharges || 0,
            details.receiptNumber,
            Array.isArray(details.additionalChargesList)
              ? details.additionalChargesList
              : [],
            now,
            true,
            regenBaseLogistics,
            regenBaseCostPerKg,
          );

      const Payment_URL = isInvoice
        ? Payment_gst_URL
        : Payment_Receipt_Regenerated;

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

      const updatedInternalTracking = (details.internalTracking || []).map(
        (step) => {
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
        },
      );

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
        paymentProof: await Promise.all(
          paymentProof.map((file) =>
            uploadFileToFirebase(file, "PAYMENT PROOF"),
          ),
        ),
        PaymentComfirmedDate: now,
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

  // Fetch rate card amount for discount calculation
  useEffect(() => {
    if (!details?.destination || !details?.service || !details?.actualWeight)
      return;
    if (details?.Source === "B To C") return;

    const service = normaliseService(details.service);
    const weight = parseFloat(details.actualWeight);
    if (!isFinite(weight) || weight <= 0) return;
    const isDutyFree = service === "EcoDutyFree";

    const actualSlab = getActualWeightSlab(details.actualWeight);
    if (!actualSlab) return;
    // Flat-slab KG (1..5) when weight is in a "N Kg FLAT" slab, else null
    const flatSlabKg = getFlatSlabKg(actualSlab);

    console.log("[RateCard lookup]", {
      destination: details.destination,
      rawService: details.service,
      normalisedService: service,
      actualWeight: details.actualWeight,
      actualSlab,
      flatSlabKg,
      isDutyFree,
    });

    (async () => {
      try {
        // 1–5 KG (any service): the rate card stores a flat ₹ for the slab.
        // Divide by slab KG to derive per-KG, then multiply by actual weight.
        if (flatSlabKg != null) {
          const actualResult = await fetchLowestRate(
            details.destination,
            service,
            actualSlab,
          );
          if (actualResult && actualResult.amount) {
            const perKg = actualResult.amount / flatSlabKg;
            setRateCardCostPerKg(perKg);
            setRateCardAmount(weight * perKg);
            setDutyFreeUpsold(false);
            return;
          }
          // Duty Free 1–5 KG without a flat rate → upsell to the 5.1–8 KG slab
          // (stored as a per-KG rate).
          if (isDutyFree) {
            const upsell = await fetchLowestRate(
              details.destination,
              service,
              "5.1 to 8 Kg",
            );
            if (upsell && upsell.amount) {
              setRateCardCostPerKg(upsell.amount);
              setRateCardAmount(weight * upsell.amount);
              setDutyFreeUpsold(true);
            }
          }
          return;
        }

        // > 5 KG: standard per-KG slab.
        const slab = getWeightSlab(details.actualWeight, details.service);
        if (!slab) return;
        const result = await fetchLowestRate(
          details.destination,
          service,
          slab,
        );
        if (result && result.amount) {
          setRateCardCostPerKg(result.amount);
          setRateCardAmount(weight * result.amount);
          setDutyFreeUpsold(false);
        }
      } catch (err) {
        console.log("Rate fetch failed:", err);
      }
    })();
  }, [details?.destination, details?.service, details?.actualWeight]);

  const handleGetPaymentPreview = (data) => {
    setPendingFormData(data);
    setShowGetPaymentConfirm(true);
  };

  const resetForm = () => {
    setPaymentProof([]);
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
    <div className="p-3 sm:p-6 max-w-3xl mx-auto bg-white shadow-md rounded-lg">
      {details ? (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-gray-50 p-4 rounded-lg shadow-sm"
        >
          {/* Header row */}
          <div className="flex items-center gap-3 mb-5">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition shrink-0"
              aria-label="Go back"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-800 leading-tight">
                Payment Confirmation
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Review shipment details and enter pricing
              </p>
            </div>
          </div>
          {/* Shipment Info Card */}
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm mb-5">
            {/* Card Header */}
            <div className="bg-[#714DD9] px-4 py-3 flex items-center justify-between">
              <span className="text-white font-semibold text-sm tracking-wide">
                Shipment Details
              </span>
              <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full tracking-wide">
                AWB # {awbnumber}
              </span>
            </div>

            {/* Sender Section */}
            <div className="bg-white px-4 pt-3 pb-1">
              <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2">
                Sender
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 pb-3 border-b border-gray-100">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">
                    Name
                  </p>
                  <p className="text-gray-800 font-medium text-sm">
                    {details.consignorname}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">
                    Phone
                  </p>
                  <p className="text-gray-800 font-medium text-sm">
                    {details.consignorphonenumber}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">
                    Address
                  </p>
                  <p className="text-gray-800 font-medium text-sm">
                    {details.consignorlocation}
                  </p>
                </div>
              </div>
            </div>

            {/* Receiver Section — only shown if any consignee data exists */}
            {details.consigneename ||
            details.consigneephonenumber ||
            details.consigneelocation ? (
              <div className="bg-white px-4 pt-3 pb-1">
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2">
                  Receiver
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 pb-3 border-b border-gray-100">
                  {details.consigneename ? (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">
                        Name
                      </p>
                      <p className="text-gray-800 font-medium text-sm">
                        {details.consigneename}
                      </p>
                    </div>
                  ) : null}
                  {details.consigneephonenumber ? (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">
                        Phone
                      </p>
                      <p className="text-gray-800 font-medium text-sm">
                        {details.consigneephonenumber}
                      </p>
                    </div>
                  ) : null}
                  {details.consigneelocation ? (
                    <div className="col-span-2">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">
                        Address
                      </p>
                      <p className="text-gray-800 font-medium text-sm">
                        {details.consigneelocation}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Shipment Meta */}
            <div className="bg-white px-4 pt-3 pb-3">
              <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2">
                Shipment
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">
                    Destination
                  </p>
                  <p className="text-gray-800 font-medium text-sm">
                    {details.destination}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">
                    service
                  </p>
                  <p className="text-gray-800 font-medium text-sm">
                    {details.service}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">
                    source
                  </p>
                  <p className="text-gray-800 font-medium text-sm">
                    {details.Source}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">
                    Weight
                  </p>
                  <p className="text-gray-800 font-medium text-sm">
                    {details.actualWeight} KG
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">
                    Pickup Person
                  </p>
                  <p className="text-gray-800 font-medium text-sm">
                    {details.pickUpPersonName}
                  </p>
                </div>
                {details.pickupCompletedDatatime ? (
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">
                      Pickup Completed
                    </p>
                    <p className="text-gray-800 font-medium text-sm">
                      {details.pickupCompletedDatatime}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Consignee editable fields — shown only when data is missing */}
          {(details.consigneename == "" ||
            details.consigneephonenumber == "" ||
            details.consigneelocation == "") && (
            <div className="rounded-xl overflow-hidden border border-purple-200 shadow-sm mb-5">
              <div className="bg-[#714DD9] px-4 py-3 flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 text-white/80 shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-white font-semibold text-sm tracking-wide">
                  Receiver Details
                </span>
                <span className="ml-auto bg-white/20 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  Required
                </span>
              </div>

              <div className="bg-white px-4 py-4 space-y-4">
                {details.consigneename == "" && (
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
                      Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter consignee name"
                      className={`w-full p-2.5 rounded-lg border text-sm focus:outline-none ${errors.consigneename1 ? "border-red-400 bg-red-50" : "border-gray-300 bg-white focus:border-purple-400"}`}
                      {...register("consigneename1", {
                        required: "Consignee name is required",
                      })}
                    />
                    {errors.consigneename1 && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.consigneename1.message}
                      </p>
                    )}
                  </div>
                )}

                {details.consigneephonenumber == "" && (
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
                      Phone Number
                    </label>
                    <div className="flex items-center gap-2 w-full">
                      <div className="shrink-0">
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
                                borderRadius: "0.5rem",
                                fontSize: "0.875rem",
                              }}
                              inputProps={{ readOnly: true, disabled: true }}
                              buttonStyle={{
                                pointerEvents: "none",
                                backgroundColor: "#f9fafb",
                                cursor: "not-allowed",
                                borderRadius: "0.5rem 0 0 0.5rem",
                              }}
                              specialLabel=""
                            />
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          placeholder="Number without country code"
                          inputMode="numeric"
                          onInput={(e) => {
                            e.target.value = e.target.value.replace(
                              /[^0-9]/g,
                              "",
                            );
                          }}
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
                          className={`w-full p-2.5 rounded-lg border text-sm focus:outline-none ${errors.consigneenumber1 ? "border-red-400 bg-red-50" : "border-gray-300 bg-white focus:border-purple-400"}`}
                        />
                        {errors.consigneenumber1 && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.consigneenumber1.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {details.consigneelocation == "" && (
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
                      Address
                    </label>
                    <input
                      {...register("consigneelocation1", {
                        required: "Consignee location required",
                      })}
                      type="text"
                      placeholder="Enter consignee address"
                      className={`w-full p-2.5 rounded-lg border text-sm focus:outline-none ${errors.consigneelocation1 ? "border-red-400 bg-red-50" : "border-gray-300 bg-white focus:border-purple-400"}`}
                    />
                    {errors.consigneelocation1 && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.consigneelocation1.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 mt-4 mb-4 pt-4">
            <h3 className="text-sm font-semibold text-purple-700 uppercase tracking-wide mb-3">
              Pricing Details
            </h3>
          </div>

          {(() => {
            const weight = parseInt(details?.actualWeight) || 0;
            const liveCostKg = Number(costKg) || 0;
            const salesLogistics = weight * liveCostKg;
            const finalLogistics = details?.logisticCost
              ? details.logisticCost
              : salesLogistics;

            return (
              <>
                <input
                  type="hidden"
                  value={finalLogistics}
                  {...register("logisticsCost", {
                    valueAsNumber: true,
                  })}
                />

                {rateCardAmount != null && costKg > 0 && (
                  <div className="mb-4">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Sales Side */}
                      <div className="rounded-lg border border-gray-200 bg-white p-3">
                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Sales Side
                        </p>
                        <div className="flex justify-between text-sm py-0.5">
                          <span className="text-gray-500">Cost/KG</span>
                          <span className="font-semibold text-gray-800">
                            ₹{liveCostKg}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm py-0.5">
                          <span className="text-gray-500">Weight</span>
                          <span className="font-semibold text-gray-800">
                            {weight} kg
                          </span>
                        </div>
                        <div className="flex justify-between text-sm py-0.5 border-t border-gray-100 mt-1 pt-1">
                          <span className="text-gray-500">Logistics</span>
                          <span className="font-semibold text-gray-800">
                            ₹{salesLogistics}
                          </span>
                        </div>
                      </div>

                      {/* Rate Card Side */}
                      <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                        <p className="text-[11px] font-semibold text-purple-700 uppercase tracking-wide mb-2">
                          Rate Card
                        </p>
                        <div className="flex justify-between text-sm py-0.5">
                          <span className="text-gray-500">Cost/KG</span>
                          <span className="font-semibold text-gray-800">
                            ₹{rateCardCostPerKg}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm py-0.5">
                          <span className="text-gray-500">Weight</span>
                          {dutyFreeUpsold ? (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5 uppercase tracking-wide">
                              Upsell → 6–8 kg rate
                            </span>
                          ) : (
                            <span className="font-semibold text-gray-800">
                              {weight} kg
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between text-sm py-0.5 border-t border-purple-100 mt-1 pt-1">
                          <span className="text-gray-500">Logistics</span>
                          <span className="font-semibold text-gray-800">
                            ₹{rateCardAmount}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Diff banner removed — now rendered above Recovered Cost */}
                  </div>
                )}
              </>
            );
          })()}
          {errors.logisticsCost && (
            <p className="text-red-500 text-sm mb-3">
              {errors.logisticsCost.message}
            </p>
          )}
          {(() => {
            const isAlreadySaved = details.discountCost != undefined;
            const hasRateCard = rateCardAmount != null && !!costKg;
            const showFurtherDiscount = hasRateCard || isAlreadySaved;
            const furtherDiscountReadOnly = isAlreadySaved;
            return (
              <div className="flex gap-3 mb-3">
                <div className="flex flex-col flex-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Cost / KG
                    {costKgAutoPopulated && (
                      <span className="ml-2 text-purple-600 normal-case font-normal">
                        (auto-filled from rate card)
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={details.costKg == null ? costKg : details.costKg}
                    className={`p-2.5 rounded-lg border text-sm ${details.costKg != null || costKgAutoPopulated ? "bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed" : "bg-white border-gray-300 focus:outline-none focus:border-purple-400"}`}
                    placeholder="Enter Cost/KG"
                    readOnly={details.costKg != null || costKgAutoPopulated}
                    {...register("costKg", {
                      required: "Cost/KG is required",
                      pattern: {
                        value: /^[0-9]+$/,
                        message:
                          "Please enter a Cost/KG consisting of digits only",
                      },
                      validate: (value) =>
                        Number.isInteger(Number(value)) ||
                        "Please enter a valid integer",
                    })}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*\.?\d*$/.test(value)) {
                        setcostKg(Number(value));
                        setValue("costKg", value);
                      }
                    }}
                  />
                </div>
                {showFurtherDiscount && (
                  <div className="flex flex-col flex-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Further Discount
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      defaultValue={0}
                      onInput={(e) => {
                        e.target.value = e.target.value.replace(/[^0-9]/g, "");
                      }}
                      className={`p-2.5 rounded-lg border text-sm ${
                        furtherDiscountReadOnly
                          ? "bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-white border-gray-300 focus:outline-none focus:border-purple-400"
                      }`}
                      placeholder="0"
                      readOnly={furtherDiscountReadOnly}
                      {...register("furtherDiscount", {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                )}
              </div>
            );
          })()}
          {errors.costKg && (
            <p className="text-red-500 text-sm mb-3">{errors.costKg.message}</p>
          )}
          {(() => {
            const isAlreadySaved = details.discountCost != undefined;
            const hasRateCard = rateCardAmount != null && !!costKg;
            const discountAmountReadOnly = isAlreadySaved || hasRateCard;
            return (
              <div className="flex flex-col mb-3">
                <label
                  className={`text-xs font-semibold uppercase tracking-wide mb-1 ${(parseInt(watch("discountCost")) || 0) > 0 ? "text-red-600" : "text-gray-500"}`}
                >
                  Total Discount Amount
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  onInput={(e) => {
                    e.target.value = e.target.value.replace(/[^0-9]/g, "");
                  }}
                  className={`p-2.5 rounded-lg border text-sm ${
                    (parseInt(watch("discountCost")) || 0) > 0
                      ? "bg-red-50 border-red-300 text-red-700 cursor-not-allowed"
                      : discountAmountReadOnly
                        ? "bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-white border-gray-300 focus:outline-none focus:border-purple-400"
                  }`}
                  placeholder="Enter 0 or amount"
                  readOnly={discountAmountReadOnly}
                  {...register("discountCost", {
                    required: "Please enter the discount amount.",
                    pattern: {
                      value: /^[0-9]+$/,
                      message:
                        "Please enter a valid discount number consisting of digits only.",
                    },
                    valueAsNumber: true,
                    validate: (value) =>
                      Number.isInteger(value) ||
                      "Please enter a valid integer number",
                  })}
                />
              </div>
            );
          })()}
          {errors.discountCost && (
            <p className="text-red-500 text-sm mb-3">
              {errors.discountCost.message}
            </p>
          )}
          {/* Diff banner — moved here, above Recovered Cost */}
          {(() => {
            const displayedRecovered = Math.max(
              (watch("recoverdCost") || 0) -
                (parseInt(watch("furtherDiscount")) || 0),
              0,
            );
            const hasMargin = displayedRecovered > 0;
            return (
              <div className="flex flex-col mb-3">
                <label
                  className={`text-xs font-semibold uppercase tracking-wide mb-1 ${hasMargin ? "text-green-700" : "text-gray-500"}`}
                >
                  Recovered Cost (Extra Margin)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={displayedRecovered}
                  className={`p-2.5 rounded-lg border text-sm cursor-not-allowed ${hasMargin ? "bg-green-50 border-green-300 text-green-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}
                  placeholder="0"
                  readOnly
                />
                <input
                  type="hidden"
                  {...register("recoverdCost", {
                    valueAsNumber: true,
                  })}
                />
              </div>
            );
          })()}
          {(() => {
            const ALL_REASONS = [
              "Fumigation",
              "Wooden Palletization",
              "Special products charges",
              "Over dimensions charges",
              "Over weight charges",
              "Pickup charges",
              "Packing charges",
              "Customise Special box charges",
              "Documentation Charges",
              "Insurance Fees",
              "Customs Clearance Charges",
            ];
            const isLocked =
              details.additionalcharges != undefined ||
              details.additionalChargesList != undefined;
            const usedReasons = watchChargesList
              .map((r) => r?.reason)
              .filter(Boolean);
            return (
              <div className="flex flex-col mb-3">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Additional Charges
                </label>
                {chargeFields.map((field, index) => {
                  const currentReason = watchChargesList[index]?.reason || "";
                  const availableReasons = ALL_REASONS.filter(
                    (r) => r === currentReason || !usedReasons.includes(r),
                  );
                  return (
                    <div
                      key={field.id}
                      className="flex flex-col sm:flex-row gap-2 mb-2 sm:items-start"
                    >
                      <div className="flex flex-col flex-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          onInput={(e) => {
                            e.target.value = e.target.value.replace(
                              /[^0-9]/g,
                              "",
                            );
                          }}
                          className={`p-2.5 rounded-lg border text-sm ${isLocked ? "bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed" : "bg-white border-gray-300 focus:outline-none focus:border-purple-400"}`}
                          placeholder="Enter amount"
                          readOnly={isLocked}
                          {...register(
                            `additionalChargesList.${index}.amount`,
                            {
                              pattern: {
                                value: /^[0-9]*$/,
                                message: "Digits only",
                              },
                              validate: (value) => {
                                const reason = watchChargesList[index]?.reason;
                                const amt = parseInt(value) || 0;
                                if (reason && amt <= 0) return "Enter amount";
                                return true;
                              },
                            },
                          )}
                        />
                        {errors?.additionalChargesList?.[index]?.amount && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.additionalChargesList[index].amount.message}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col flex-1">
                        <select
                          className={`p-2.5 rounded-lg border text-sm ${isLocked ? "bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed" : "bg-white border-gray-300 focus:outline-none focus:border-purple-400"}`}
                          disabled={isLocked}
                          {...register(
                            `additionalChargesList.${index}.reason`,
                            {
                              validate: (value) => {
                                const amt =
                                  parseInt(watchChargesList[index]?.amount) ||
                                  0;
                                if (amt > 0 && !value) return "Select a reason";
                                return true;
                              },
                            },
                          )}
                        >
                          <option value="">Select a reason</option>
                          {availableReasons.map((reason) => (
                            <option key={reason} value={reason}>
                              {reason}
                            </option>
                          ))}
                        </select>
                        {errors?.additionalChargesList?.[index]?.reason && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.additionalChargesList[index].reason.message}
                          </p>
                        )}
                      </div>
                      {!isLocked && chargeFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCharge(index)}
                          className="self-end sm:self-auto p-2.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 text-sm"
                          title="Remove"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
                {!isLocked && chargeFields.length < ALL_REASONS.length && (
                  <button
                    type="button"
                    onClick={() => appendCharge({ amount: "", reason: "" })}
                    className="mt-1 self-start px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100"
                  >
                    + Add
                  </button>
                )}
              </div>
            );
          })()}

          {/* Live total summary */}
          {(() => {
            const liveDiscount = parseInt(watch("discountCost")) || 0;
            const liveCharges = watchChargesList.filter(
              (r) => (parseInt(r?.amount) || 0) > 0,
            );
            const liveAdditional = liveCharges.reduce(
              (s, r) => s + (parseInt(r?.amount) || 0),
              0,
            );
            const liveCostKg =
              details.costKg != null ? parseInt(details.costKg) : costKg;
            const salesLogistics = parseInt(details?.actualWeight) * liveCostKg;
            // Headline Logistics Cost = rate-card list price when available,
            // so the combined discount visibly subtracts down to sales − further.
            const liveLogistics =
              rateCardAmount != null && rateCardAmount > salesLogistics
                ? rateCardAmount
                : salesLogistics;
            const liveTotal = liveLogistics + liveAdditional - liveDiscount;
            return (
              <div className="mt-4 mb-2 rounded-xl border border-purple-100 bg-purple-50 p-4 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Logistics Cost</span>
                  <span className="font-medium text-gray-700">
                    ₹ {liveLogistics}
                  </span>
                </div>
                {liveCharges.map((row, i) => (
                  <div key={i} className="flex justify-between py-1">
                    <span className="text-gray-500">
                      {row.reason || "Additional Charges"}
                    </span>
                    <span className="font-medium text-green-500">
                      + ₹ {parseInt(row.amount) || 0}
                    </span>
                  </div>
                ))}
                {liveDiscount > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Discount</span>
                    <span className="font-medium text-red-600">
                      − ₹ {liveDiscount}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 mt-1 border-t border-purple-200">
                  <span className="font-bold text-gray-800">
                    Total (Client Pays)
                  </span>
                  <span className="font-bold text-purple-700 text-base">
                    ₹ {liveTotal}
                  </span>
                </div>
              </div>
            );
          })()}

          <div className="border-t border-gray-200 mt-4 mb-4 pt-4">
            <h3 className="text-sm font-semibold text-purple-700 uppercase tracking-wide mb-3">
              Payment & Documents
            </h3>
          </div>

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
                  Payment Proof{" "}
                  <span className="font-normal text-gray-500">
                    (upload 1 or 2 images)
                  </span>
                </label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                  onClick={() =>
                    document.getElementById("payment-proof-input").click()
                  }
                >
                  <p className="text-gray-700 font-medium">
                    Click to upload Payment Proof
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Only image files are allowed
                  </p>
                </div>
                <input
                  id="payment-proof-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  required
                />
                {paymentProof.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {paymentProof.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-purple-50 rounded-lg"
                      >
                        <span className="text-gray-700 text-sm truncate">
                          {file.name}
                        </span>
                        <div className="flex items-center gap-2 ml-2">
                          <span className="text-purple-600 font-medium text-sm">
                            IMG
                          </span>
                          <button
                            type="button"
                            onClick={() => removePaymentProof(index)}
                            className="text-red-400 hover:text-red-600 text-sm font-medium"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  Upload KYC Document{" "}
                  <span className="font-normal text-gray-500">(PDF only)</span>
                </label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
                  onClick={() =>
                    document.getElementById("kyc-file-input").click()
                  }
                >
                  <p className="text-gray-700 font-medium">
                    Click to upload KYC PDF
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Only PDF files are allowed
                  </p>
                </div>
                <input
                  id="kyc-file-input"
                  type="file"
                  accept="application/pdf"
                  onChange={handleKYCFileChange}
                  className="hidden"
                  required
                />
                {KycImage && (
                  <div className="flex items-center justify-between mt-2 p-3 bg-purple-50 rounded-lg">
                    <span className="text-gray-700 text-sm truncate">
                      {KycImage.name}
                    </span>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-purple-600 font-medium text-sm">
                        PDF
                      </span>
                      <button
                        type="button"
                        onClick={removeKycImage}
                        className="text-red-400 hover:text-red-600 text-sm font-medium"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
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
            <button
              type="button"
              onClick={() => paymentConfirm()}
              disabled={submitLoading}
              className={`w-full mt-4 p-2 text-center bg-[#714DD9] text-white font-semibold rounded focus:outline-none focus:ring-2 focus:ring-purple-600 ${
                submitLoading
                  ? "opacity-60 cursor-not-allowed"
                  : "cursor-pointer hover:bg-purple-700"
              }`}
            >
              {submitLoading ? "Submitting..." : "Submit"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit(handleGetPaymentPreview)}
              className="w-full mt-4 p-2 flex items-center justify-center bg-[#714DD9] text-white font-semibold rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-600"
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
      {/* Pre-submit confirmation modal for Get Payment */}
      {showGetPaymentConfirm && pendingFormData && (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-70">
          <div className="bg-white w-full max-w-sm mx-4 rounded-xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-1">
              Confirm Payment Request
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Review the details before sending to customer.
            </p>

            {(() => {
              const popupSales =
                parseInt(details.actualWeight) *
                parseInt(pendingFormData.costKg);
              const popupLogistics =
                rateCardAmount != null && rateCardAmount > popupSales
                  ? rateCardAmount
                  : popupSales;
              const popupDiscount = parseInt(pendingFormData.discountCost) || 0;
              const popupCharges = (
                pendingFormData.additionalChargesList || []
              ).filter((r) => (parseInt(r?.amount) || 0) > 0);
              const popupAdditional = popupCharges.reduce(
                (s, r) => s + (parseInt(r?.amount) || 0),
                0,
              );
              const popupTotal =
                popupLogistics + popupAdditional - popupDiscount;
              return (
                <div className="space-y-0 text-sm">
                  <div className="flex justify-between py-2.5 border-b border-gray-100">
                    <span className="text-gray-500">Logistics Cost</span>
                    <span className="font-medium text-gray-800">
                      ₹ {popupLogistics}
                    </span>
                  </div>
                  {popupCharges.map((row, i) => (
                    <div
                      key={i}
                      className="flex justify-between py-2.5 border-b border-gray-100"
                    >
                      <span className="text-gray-500">
                        {row.reason || "Additional Charges"}
                      </span>
                      <span className="font-medium text-green-500">
                        + ₹ {parseInt(row.amount) || 0}
                      </span>
                    </div>
                  ))}
                  {popupDiscount > 0 && (
                    <div className="flex justify-between py-2.5 border-b border-gray-100">
                      <span className="text-gray-500">Discount</span>
                      <span className="font-medium text-red-600">
                        − ₹ {popupDiscount}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-3 mt-2 bg-purple-50 rounded-xl px-4">
                    <span className="font-bold text-gray-800">
                      Total (Client Pays)
                    </span>
                    <span className="font-bold text-purple-700 text-lg">
                      ₹ {popupTotal}
                    </span>
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-3 mt-6">
              <button
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                onClick={() => {
                  setShowGetPaymentConfirm(false);
                  setPendingFormData(null);
                }}
              >
                Cancel
              </button>
              <button
                disabled={submitLoading}
                className="flex-1 py-2 px-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition disabled:opacity-60"
                onClick={() => {
                  setShowGetPaymentConfirm(false);
                  onSubmit(pendingFormData);
                }}
              >
                {submitLoading ? "Submitting..." : "Confirm & Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden canvas for generating barcode */}
      <canvas ref={barcodeRef} style={{ display: "none" }} />
    </div>
  );
}
export default PaymentConfirmationForm;
