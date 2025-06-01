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
} from "firebase/firestore";
import collectionName_BaseAwb from "./functions/collectionName";
import axios from "axios";
import jsPDF from "jspdf";
import utilityFunctions from "./Utility/utilityFunctions";
import Lottie from "lottie-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import DB from "./DB/DB";

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
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm();
  const navigate = useNavigate();
  const [downloadURL, setdownloadURL] = useState("");
  const [animationData, setAnimationData] = useState(null);
  const dialCodeRef = useRef(null);

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
          JSON.parse(localStorage.getItem("LoginCredentials")).Location
        )
      ),
      where("awbNumber", "==", parseInt(awbnumber))
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
          "An error occurred while fetching data. Please try again later."
        );
        setLoading(false); // Stop loading on error
      }
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

  async function generate_Invoice_PDF(costKg, discountCost, additionalcharges) {
    const doc = new jsPDF("p", "pt");
    const subtotal = parseInt(costKg) * details.actualWeight;
    const nettotal = subtotal - parseInt(discountCost) + additionalcharges;
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

    const address = `2C, Rajarajan Street, Main Rd, Navarathna Garden, Ekkatuthangal, Chennai, Tamil Nadu 600032`;
    const phoneNumber = `\n9159 688 688`; // Add a newline before the phone number

    const fullText = address + phoneNumber; // Combine address and phone number
    const splitText1 = doc.splitTextToSize(fullText, maxWidth);
    doc.text(splitText1, 40, 180);

    // Bill To
    doc.setFont("helvetica", "bold");
    doc.text("Receipt to:", 350, 140);
    doc.setFontSize(12);

    doc.setFont("helvetica", "normal");
    doc.text(details.consignorname, 350, 160);

    const consignorLocation = details.consignorlocation.toLowerCase();
    const fullText1 = consignorLocation + "\n" + details.consignorphonenumber;
    const splitText = doc.splitTextToSize(fullText1, maxWidth);
    doc.text(splitText, 350, 180);

    // Align invoice details at the top-right corner
    const pageWidth = doc.internal.pageSize.getWidth();
    const rightMargin = pageWidth - 40; // Right margin of 40 units

    doc.setFont("helvetica", "normal");
    doc.text(`Receipt Number: RCPT-${details.awbNumber}`, rightMargin, 40, {
      align: "right",
    });
    doc.text(`Date: ${await getTodayDate()}`, rightMargin, 61, {
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
          details.destination,
          details.service + " " + "Service",
          details.actualWeight + " KG",
          `${costKg} Rs`,
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
    const terms = `* This invoice is only valid for ${details.actualWeight} Kg.
* Shipments exceeding ${details.actualWeight} KG will attract additional costs.
* All shipments sent are subject to customs clearance only.
* Customs duty applicable (if any).`;
    const splitTerms = doc.splitTextToSize(terms, maxWidth + 300);
    doc.text(splitTerms, 40, doc.lastAutoTable.finalY + 50);

    const labelX = 330;
    const valueX = 460;
    let currentY = doc.lastAutoTable.finalY + 120;

    // Subtotal
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Subtotal:", labelX, currentY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 128, 0); // green
    doc.text(`${subtotal}.00 Rs`, valueX, currentY);
    currentY += 19;

    // Additional Charges (always shown)
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Additional Charges:", labelX, currentY);
    doc.setFont("helvetica", "normal");
    if (additionalcharges > 0) {
      doc.setTextColor(0, 128, 0); // green
    } else {
      doc.setTextColor(150, 150, 150); // gray
    }
    doc.text(`+ ${additionalcharges}.00 Rs`, valueX, currentY);
    currentY += 19;

    // Discount (always shown)
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Discount:", labelX, currentY);
    doc.setFont("helvetica", "normal");
    if (discountCost > 0) {
      doc.setTextColor(220, 20, 60); // red
    } else {
      doc.setTextColor(150, 150, 150); // gray
    }
    doc.text(`- ${discountCost}.00 Rs`, valueX, currentY);
    currentY += 19;

    // Total
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Total:", labelX, currentY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 100, 0); // dark green
    doc.text(`${nettotal}.00 Rs`, valueX, currentY);

    // Reset text color
    doc.setTextColor(0, 0, 0);

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
        "An error occurred while uploading the document."
      );
    }
  }
  function getTruncatedURL(fullUrl) {
    const baseUrl =
      "https://firebasestorage.googleapis.com/v0/b/shiphitmobileapppickup-4d0a1.appspot.com/o/";
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
    additionalcharges
  ) {
    try {
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
              templateName: "paymentrequest",
              templateData: {
                body: {
                  placeholders: [
                    String(consignorname),
                    String(
                      logisticCost + parseInt(additionalcharges) - discount
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
      const messageStatus = response?.data?.messages?.[0]?.status === "SENT";
      // Update Firestore document
      const pickupRef = doc(db, DB.db_collection, docId);
      await updateDoc(pickupRef, { makePaymentNotified: messageStatus });
      // Success message
      utilityFunctions.SuccessNotify(
        "Make Payment notification sent successfully."
      );
    } catch (error) {
      console.log("error", error);
      utilityFunctions.ErrorNotify(error.message);
    } finally {
    }
  }

  const onSubmit = async (data) => {
    if (costKg < 500) {
      setError("costKg", {
        type: "manual",
        message: "Cost/KG must be at least 500",
      });
      return;
    }

    setSubmitLoading(true);
    try {
      if (!details) {
        throw new Error("User details not found");
      }
      const Payment_URL = await generate_Invoice_PDF(
        data.costKg,
        data.discountCost,
        data.additionalcharges
      );
      const q = query(
        collection(
          db,
          collectionName_BaseAwb.getCollection(
            JSON.parse(localStorage.getItem("LoginCredentials")).Location
          )
        ),
        where("awbNumber", "==", parseInt(awbnumber))
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
          JSON.parse(localStorage.getItem("LoginCredentials")).Location
        ),
        final_result[0].id
      ); // db is your Firestore instance

      const updatedFields = {
        status: "PAYMENT REQUESTED",
        logisticCost:
          parseInt(logisticCost + data.additionalcharges) -
          parseInt(data.discountCost),
        discountCost: data.discountCost,
        // paymentProof: await uploadFileToFirebase(paymentProof, "PAYMENT PROOF"),
        KycImage: await uploadFileToFirebase(KycImage, "KYC"),
        PaymentComfirmedDate: await getTodayDate(),
        consigneename: !data.consigneename1
          ? details.consigneename
          : data.consigneename1,
        consigneephonenumber: !data.consigneenumber1
          ? details.consigneephonenumber
          : data.consigneenumber1,
        consigneelocation: !data.consigneelocation1
          ? details.consigneelocation
          : data.consigneelocation1,
        costKg: costKg,
        payment_Receipt_URL: Payment_URL,
        additionalcharges: data.additionalcharges,
      };
      updateDoc(docRef, updatedFields);
      await makePaymentNotify(
        details.id,
        Payment_URL,
        data.discountCost,
        details.consignorphonenumber,
        details.consignorname,
        logisticCost,
        data.additionalcharges
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
      const Payment_URL = details.payment_Receipt_URL;
      const q = query(
        collection(
          db,
          collectionName_BaseAwb.getCollection(
            JSON.parse(localStorage.getItem("LoginCredentials")).Location
          )
        ),
        where("awbNumber", "==", parseInt(awbnumber))
      );
      const querySnapshot = await getDocs(q);
      let final_result = [];
      querySnapshot.forEach((doc) => {
        final_result.push({ id: doc.id, ...doc.data() });
      });
      const docRef = doc(
        db,
        collectionName_BaseAwb.getCollection(
          JSON.parse(localStorage.getItem("LoginCredentials")).Location
        ),
        final_result[0].id
      );
      const updatedFields = {
        status: "PAYMENT DONE",
        paymentProof: await uploadFileToFirebase(paymentProof, "PAYMENT PROOF"),
        payment_Receipt_URL: Payment_URL,
      };
      updateDoc(docRef, updatedFields);
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
                  language: "en_US",
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
                      { type: "URL", parameter: String(details.awbNumber) },
                    ],
                  },
                  templateName: "payment_completed_final",
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
        "An error occurred while processing your request."
      );
    } else if (error.request) {
      // Handle no response from the server
      utilityFunctions.ErrorNotify(
        "Unable to connect. Please check your network."
      );
    } else {
      // Handle other types of errors
      utilityFunctions.ErrorNotify("An unexpected error occurred.");
    }
  };

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
            <input
              type="text"
              value={details.consignorname}
              readOnly
              className="p-2 border rounded bg-gray-100"
            />
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
          <div className="flex flex-col mb-4">
            <label className="text-gray-700 font-medium mb-1">Vendor</label>
            <input
              type="text"
              value={details.vendorName}
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
          {details.consigneephonenumber == "" ? (
            <>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  Consignee Phone Number
                </label>
                <Controller
                  name="consigneenumber1"
                  control={control}
                  rules={{
                    required: "Country code and phone number are required",
                    validate: (value) => {
                      // if they haven't touched it at all
                      if (!value) return false;

                      // if they never picked a flag
                      if (!dialCodeRef.current) {
                        return "Please select a country code";
                      }

                      // strip non‑digits, then remove the dialCode length
                      const digitsOnly = value.replace(/\D/g, "");
                      const subscriber = digitsOnly.slice(
                        dialCodeRef.current.length
                      );
                      const len = subscriber.length;

                      if (len === 0) return "Please enter a phone number";
                      if (len < 4) return "Phone number is too short";
                      if (len > 15) return "Phone number is too long";

                      return true;
                    },
                  }}
                  render={({ field }) => (
                    <PhoneInput
                      enableSearch
                      placeholder="Enter phone number"
                      value={field.value}
                      onChange={(value, data) => {
                        dialCodeRef.current = data.dialCode; // store the code
                        field.onChange(value);
                      }}
                      inputStyle={{
                        width: "100%",
                        padding: "12px 48px",
                        borderColor: errors.consigneenumber1
                          ? "#f87171"
                          : "#d1d5db",
                        borderRadius: "0.375rem",
                        fontSize: "1rem",
                      }}
                      containerStyle={{ width: "100%" }}
                      specialLabel=""
                    />
                  )}
                />
                {errors.consigneenumber1 && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.consigneenumber1.message}
                  </p>
                )}
              </div>
            </>
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
            {console.log(details.discountCost ? true : false)}
            {console.log(details.discountCost)}
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
              readOnly={!!details.additionalcharges} // Readonly if discountCost exists
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
