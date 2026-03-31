import { useEffect, useState } from "react";
import Nav from "./Nav";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDocs,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "./firebase";
import axios from "axios";
import Lottie from "lottie-react";
import loadingAnimation from "../public/loading_sharebtn.json";
import DB from "./DB/DB";
import ShipmentDetails from "./ShipmentDetails";
import utilityFunctions from "./Utility/utilityFunctions";
import oneMonthAgo from "./Utility/oneMonthAgo";

export default function Myshipments() {
  const [selectedRecipient, setSelectedRecipient] = useState({});
  const [username, setUsername] = useState(null);
  const [role, setRole] = useState("");
  const [data, setdata] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const PAGE_SIZE = 20;
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed
  const [hasNextPage, setHasNextPage] = useState(false);
  const [pageCursors, setPageCursors] = useState([null]); // pageCursors[i] = startAfter doc for page i
  const [awbSearchTerm, setAwbSearchTerm] = useState("");
  const [consignorPhoneSearchTerm, setConsignorPhoneSearchTerm] = useState("");
  const [awbSearchResults, setAwbSearchResults] = useState([]);
  const [awbSearchLoading, setAwbSearchLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPickup, setSelectedPickup] = useState(null);
  // -------- Escalation helpers --------
  const ORIGIN = typeof window !== "undefined" ? window.location.origin : "";
  const ESCALATION_ADD_URL = (awb, escalationId) =>
    `${ORIGIN}/EscalationSystem?mode=add&awb=${encodeURIComponent(awb)}${
      escalationId ? `&escalationId=${encodeURIComponent(escalationId)}` : ""
    }`;

  const openInNewTab = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleAddReport = (item) => {
    openInNewTab(
      `/ReportForm?mode=add&awb=${encodeURIComponent(item.awbNumber)}`,
    );
  };

  // -------- View Escalations Modal (for any role) --------
  const [escModalOpen, setEscModalOpen] = useState(false);
  const [escRows, setEscRows] = useState([]);
  const [escLoading, setEscLoading] = useState(false);
  const [escError, setEscError] = useState("");
  const [escAwb, setEscAwb] = useState(null);

  // Lightbox for modal images
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (imgs, idx) => {
    setLightboxImages(imgs);
    setLightboxIndex(idx || 0);
    setLightboxOpen(true);
  };
  const closeLightbox = () => setLightboxOpen(false);

  const formatTS = (ts) => {
    try {
      const d = ts?.toDate?.() || null;
      if (!d) return "-";
      return d.toLocaleString();
    } catch {
      return "-";
    }
  };

  const formatTime = (ts) => {
    try {
      const d = ts?.toDate?.() || null;
      if (!d) return "";
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const getMillis = (ts) => {
    try {
      const d = ts?.toDate?.() || new Date(ts);
      const n = d.getTime();
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  };

  const Field = ({ label, value, multiline }) => (
    <div className="text-sm">
      <div className="flex items-start gap-1">
        <span className="font-semibold text-purple-700">{label}</span>
        <span className="text-black">:</span>
        <span
          className={`text-black ${
            multiline ? "whitespace-pre-wrap break-words" : ""
          }`}
        >
          {value || "-"}
        </span>
      </div>
    </div>
  );

  const handleViewEscalation = async (item) => {
    setEscError("");
    setEscRows([]);
    setEscLoading(true);
    setEscModalOpen(true);
    setEscAwb(item?.awbNumber ?? "");

    try {
      const awb = item?.awbNumber;
      const awbNum = Number(awb);
      const isNum = !Number.isNaN(awbNum);

      let docsNum = [];
      let docsStr = [];

      // Query by number (if numeric)
      try {
        if (isNum) {
          const qNum = query(
            collection(db, "ecalatoins"),
            where("awbNumber", "==", awbNum),
          );
          const snapNum = await getDocs(qNum);
          docsNum = snapNum.docs;
        }
      } catch (e) {
        console.warn("Numeric AWB query failed (continuing):", e);
      }

      // Query by string
      try {
        const qStr = query(
          collection(db, "ecalatoins"),
          where("awbNumber", "==", String(awb)),
        );
        const snapStr = await getDocs(qStr);
        docsStr = snapStr.docs;
      } catch (e) {
        console.warn("String AWB query failed (continuing):", e);
      }

      // Merge unique & sort by createdAt (oldest first)
      const mergedMap = new Map();
      [...docsNum, ...docsStr].forEach((d) =>
        mergedMap.set(d.id, { id: d.id, ...d.data() }),
      );
      const merged = Array.from(mergedMap.values()).sort((a, b) => {
        const ta = a.escalationCreatedAt?.toDate?.() || new Date(0);
        const tb = b.escalationCreatedAt?.toDate?.() || new Date(0);
        return ta - tb;
      });

      if (merged.length === 0) {
        setEscError("No escalations found for this AWB.");
      }
      setEscRows(merged);
    } catch (e) {
      console.error(e);
      setEscError("No escalations found for this AWB.");
    } finally {
      setEscLoading(false);
    }
  };

  const closeEscModal = () => {
    setEscModalOpen(false);
    setEscRows([]);
    setEscAwb(null);
  };

  // -------- FEEDBACK STATE --------

  // Live feedback map: { [awbNumberString]: feedbackDocData }
  const [feedbackByAwb, setFeedbackByAwb] = useState({});
  const [fbModalOpen, setFbModalOpen] = useState(false);
  const [fbPickup, setFbPickup] = useState(null);
  const [fbForm, setFbForm] = useState({
    comments: "",
    discount: "",
  });
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [fbSaving, setFbSaving] = useState(false);
  const [fbError, setFbError] = useState("");
  const [fbMode, setFbMode] = useState("add"); // "add" | "view"
  const [fbExisting, setFbExisting] = useState(null);

  // NEW: discount toggle (Yes/No)
  const [discountEnabled, setDiscountEnabled] = useState(false);

  // Subscribe to all feedback docs and build a map by AWB
  useEffect(() => {
    const q = collection(db, "feedback");
    const unsub = onSnapshot(q, (snap) => {
      const map = {};
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const key = String(d.awbNumber);
        map[key] = { id: docSnap.id, ...d };
      });
      setFeedbackByAwb(map);
    });

    return () => unsub();
  }, []);

  const openFeedbackModal = (item) => {
    const key = String(item.awbNumber);
    const existing = feedbackByAwb[key] || null;

    setFbPickup(item);
    setFbExisting(existing);
    setFbMode(existing ? "view" : "add");

    const initialDiscount = existing?.discount ?? item.discount ?? "";

    setFbForm({
      comments: existing?.comments || "",
      discount: initialDiscount,
    });

    // Toggle YES if there is an existing discount; otherwise NO
    setDiscountEnabled(!!initialDiscount);

    setRating(existing?.starRatings || 0);
    setHovered(0);
    setFbError("");
    setFbModalOpen(true);
  };

  const closeFeedbackModal = () => {
    if (fbSaving) return;
    setFbModalOpen(false);
    setFbPickup(null);
    setFbExisting(null);
    setFbMode("add");
    setFbForm({
      comments: "",
      discount: "",
    });
    setRating(0);
    setHovered(0);
    setFbError("");
    setDiscountEnabled(false);
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!fbPickup || fbMode === "view") return;

    // ⭐ Rating validation
    if (!rating || rating < 1) {
      setFbError("Please select at least 1 star.");
      return;
    }

    // 📝 Comment length validation
    const commentLength = fbForm.comments.trim().length;
    if (commentLength < 20) {
      setFbError("Comments must be at least 20 characters.");
      return;
    }
    if (commentLength > 200) {
      setFbError("Comments cannot exceed 200 characters.");
      return;
    }

    // 💰 Discount validation (only if toggle is ON and field not empty)
    let cleanedDiscount = null;
    if (discountEnabled && fbForm.discount.trim() !== "") {
      const d = fbForm.discount.trim();

      if (!/^\d+$/.test(d)) {
        setFbError("Discount must be numeric digits only.");
        return;
      }

      if (d.length > 4) {
        setFbError("Discount cannot exceed 4 digits.");
        return;
      }

      cleanedDiscount = d;
    }

    setFbSaving(true);
    setFbError("");

    try {
      // ⭐ USE SAME DOC ID AS PICKUP
      await setDoc(doc(db, "feedback", fbPickup.id), {
        awbNumber: fbPickup.awbNumber,
        consignorName: fbPickup.consignorname,
        consignorPhone: fbPickup.consignorphonenumber,
        consigneeName: fbPickup.consigneename,
        consigneePhone: fbPickup.consigneephonenumber,
        service: fbPickup.service,

        comments: fbForm.comments.trim(),
        starRatings: rating,
        // Store discount only if toggle ON and valid
        discount: cleanedDiscount,

        createdBy: username || "",
        createdAt: serverTimestamp(),
      });

      closeFeedbackModal();
    } catch (err) {
      console.error("Error saving feedback:", err);
      setFbError("Failed to save feedback. Please try again.");
    } finally {
      setFbSaving(false);
    }
  };

  // -------- End Escalation / Feedback helpers --------

  async function Sharetrackinglink({
    name,
    awb,
    awbHashedValue,
    mode,
    destination,
    phone,
    currentStatus,
    packageConnectedDataTime,
  }) {
    setLoading(true);

    try {
      if (selectedRecipient[awb] === "consignee") {
        // no-op if needed
      }

      const estimatedDelivery = utilityFunctions.getEstimatedDate(
        packageConnectedDataTime,
        mode,
        destination,
      );

      const currentStatus_temp = currentStatus ? currentStatus : "-";
      const payload = {
        messages: [
          {
            content: {
              language: "en",
              templateData: {
                body: {
                  placeholders: [
                    name,
                    currentStatus_temp,
                    destination,
                    estimatedDelivery,
                  ],
                },
                buttons: [
                  {
                    type: "URL",
                    parameter: String(awbHashedValue),
                  },
                ],
              },
              templateName: "shareshipmentstatus_test_4",
            },
            from: "+919600690881",
            to: `+91${phone}`,
          },
        ],
      };

      await axios.post(
        "https://public.doubletick.io/whatsapp/message/template",
        payload,
        {
          headers: {
            Authorization: "key_z6hIuLo8GC",
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      );
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  }

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("LoginCredentials"));
    setUsername(storedUser?.name);
    setRole(storedUser?.role || "");
  }, []);

  const fetchPage = async (pageIndex, cursors, currentRole, currentUsername) => {
    const resolvedRole = currentRole ?? role;
    const resolvedUsername = currentUsername ?? username;
    if (!resolvedRole) return;
    if (resolvedRole !== "Manager" && resolvedRole !== "sales admin" && !resolvedUsername) return;

    setDataLoading(true);
    try {
      const cursor = cursors[pageIndex];

      let baseConstraints;
      if (resolvedRole === "Manager" || resolvedRole === "sales admin") {
        baseConstraints = [orderBy("pickupDatetime", "desc")];
      } else {
        baseConstraints = [
          where("pickupBookedBy", "==", resolvedUsername),
          where("pickupDatetime", ">=", Timestamp.fromDate(oneMonthAgo)),
          orderBy("pickupDatetime", "desc"),
        ];
      }

      const qy = cursor
        ? query(collection(db, DB.db_collection), ...baseConstraints, startAfter(cursor), limit(PAGE_SIZE))
        : query(collection(db, DB.db_collection), ...baseConstraints, limit(PAGE_SIZE));

      const snap = await getDocs(qy);
      const pickupData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setdata(pickupData);

      if (snap.docs.length === PAGE_SIZE) {
        setHasNextPage(true);
        const nextCursor = snap.docs[snap.docs.length - 1];
        setCursorForPage(pageIndex + 1, nextCursor, cursors);
      } else {
        setHasNextPage(false);
      }
      setCurrentPage(pageIndex);
    } catch (e) {
      console.error("Error fetching page:", e);
    } finally {
      setDataLoading(false);
    }
  };

  const setCursorForPage = (pageIndex, cursor, existingCursors) => {
    setPageCursors((prev) => {
      const base = existingCursors ?? prev;
      const updated = [...base];
      updated[pageIndex] = cursor;
      return updated;
    });
  };

  useEffect(() => {
    if (!role) return;
    if (role !== "Manager" && role !== "sales admin" && !username) return;
    const initialCursors = [null];
    setPageCursors(initialCursors);
    setCurrentPage(0);
    fetchPage(0, initialCursors, role, username);
  }, [role, username]);

  const goNextPage = () => {
    fetchPage(currentPage + 1, pageCursors);
  };

  const goPrevPage = () => {
    fetchPage(currentPage - 1, pageCursors);
  };

  useEffect(() => {
    const term = awbSearchTerm.trim();
    if (!term) {
      setAwbSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setAwbSearchLoading(true);
      try {
        const termNum = Number(term);
        const isNum = !isNaN(termNum);
        let docsStr = [];
        let docsNum = [];
        const qStr = query(collection(db, DB.db_collection), where("awbNumber", "==", term));
        const snapStr = await getDocs(qStr);
        docsStr = snapStr.docs;
        if (isNum) {
          const qNum = query(collection(db, DB.db_collection), where("awbNumber", "==", termNum));
          const snapNum = await getDocs(qNum);
          docsNum = snapNum.docs;
        }
        const mergedMap = new Map();
        [...docsStr, ...docsNum].forEach((d) => mergedMap.set(d.id, { id: d.id, ...d.data() }));
        setAwbSearchResults(Array.from(mergedMap.values()));
      } catch (e) {
        console.error("AWB search error:", e);
      } finally {
        setAwbSearchLoading(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [awbSearchTerm]);

  const filteredPickups = data.filter((pickup) => {
    const consignorPhoneMatch = (pickup.consignorphonenumber || "")
      .toLowerCase()
      .includes(consignorPhoneSearchTerm.toLowerCase());
    return consignorPhoneMatch;
  });

  const displayData = awbSearchTerm.trim()
    ? awbSearchResults.filter((pickup) =>
        (pickup.consignorphonenumber || "")
          .toLowerCase()
          .includes(consignorPhoneSearchTerm.toLowerCase())
      )
    : filteredPickups;

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPickup(null);
  };
  const handleMoreIconClick = (pickup) => {
    setSelectedPickup(pickup);
    setIsModalOpen(true);
  };

  // Small UI helpers
  const Pill = ({ children, type = "neutral" }) => {
    const map = {
      neutral: "bg-gray-100 text-gray-700",
      pending: "bg-yellow-100 text-yellow-800",
      closed: "bg-green-100 text-green-800",
    };
    return (
      <span
        className={`px-2 py-1 rounded text-[11px] font-medium ${map[type]}`}
      >
        {children}
      </span>
    );
  };

  const tableHeader =
    role === "Manager" || role === "sales admin"
      ? [
          "AWB",
          "Consignor Name",
          "Consignor No.",
          "Consignee No.",
          "Status",
          "Send To",
          "Share",
          "Current Status",
          "Last Update",
          "Track",
          "Details",
          "Escalation",
          "Feedback",
        ]
      : [
          "AWB",
          "Consignor Name",
          "Consignor No.",
          "Consignee No.",
          "Status",
          "Send To",
          "Share",
          "Current Status",
          "Last Update",
          "Track",
          "Details",
          "Escalation",
        ];
  // Soft color palette based on rating 1–5
  const getFeedbackButtonClasses = (hasFeedback, rating) => {
    const base =
      "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors duration-200 border ";

    if (!hasFeedback) {
      // No feedback yet -> default yellow "Feedback" button
      return (
        base + "bg-yellow-500 text-white border-yellow-600 hover:bg-yellow-600"
      );
    }

    // Ensure integer 1–5
    const r = Math.max(1, Math.min(5, Number(rating || 0)));
    switch (r) {
      case 1:
        // Very Poor – Soft Red
        return base + "bg-red-100 text-red-700 border-red-300 hover:bg-red-200";

      case 2:
        // Poor – Soft Orange
        return (
          base +
          "bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200"
        );

      case 3:
        // Average – Soft Amber/Yellow
        return (
          base +
          "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200"
        );

      case 4:
        // Good – Soft Teal
        return (
          base + "bg-sky-200 text-teal-700 border-teal-300 hover:bg-teal-200"
        );

      case 5:
        // Excellent – Soft Emerald/Green
        return (
          base +
          "bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200"
        );

      default:
        // Fallback – Neutral Green
        return (
          base +
          "bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200"
        );
    }
  };

  return (
    <>
      <Nav />
      <div className="container mx-auto p-6">
        <h2 className="text-3xl font-bold text-[#7447D4] mb-6">My Shipments</h2>
        <div className="mb-6 flex flex-wrap gap-10">
          <input
            type="text"
            placeholder="Search by AWB Number"
            value={awbSearchTerm}
            onChange={(e) => setAwbSearchTerm(e.target.value)}
            className="border border-gray-300 rounded py-2 px-4 w-fit mb-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
          <input
            type="text"
            placeholder="Search by Consignor Phone Number"
            value={consignorPhoneSearchTerm}
            onChange={(e) => setConsignorPhoneSearchTerm(e.target.value)}
            className="border border-gray-300 rounded py-2 px-4 w-[230px] mb-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
        <div className="overflow-x-auto scroll-container border rounded-lg shadow">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-[#7447D4] text-white text-left">
              <tr>
                {tableHeader.map((header) => (
                  <th
                    key={header}
                    className="py-3 px-4 whitespace-nowrap font-medium border"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataLoading || awbSearchLoading ? (
                <tr>
                  <td colSpan={tableHeader.length} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-20 h-20">
                        <Lottie animationData={loadingAnimation} loop autoplay />
                      </div>
                      <span className="text-sm text-gray-400">Loading shipments…</span>
                    </div>
                  </td>
                </tr>
              ) : displayData.length > 0
                ? displayData.map((item, i) => {
                    const escStatus = (
                      item.escalationStatus || "none"
                    ).toLowerCase(); // "none" | "pending" | "closed"
                    const fbKey = String(item.awbNumber);
                    const hasFeedback = !!feedbackByAwb[fbKey];

                    return (
                      <tr
                        key={item.awbNumber}
                        className="border-b hover:bg-gray-50 transition"
                      >
                        <td className="px-4  py-2">{item.awbNumber}</td>
                        <td className="px-4 border py-2">
                          {item.consignorname}
                        </td>
                        <td className="px-4 border py-2">
                          {item.consignorphonenumber}
                        </td>
                        <td className="px-4 border py-2">
                          {item.consigneephonenumber}
                        </td>
                        <td className="px-4 border py-2 whitespace-nowrap">
                          {item.status}
                        </td>

                        <td className="px-4 border  py-2">
                          <div className="flex gap-2">
                            {["consignor", "consignee"].map((type) => {
                              const isSelected =
                                selectedRecipient[item.awbNumber] === type;
                              return (
                                <label
                                  key={type}
                                  className={`px-3 py-1 rounded-md border cursor-pointer text-xs font-medium ${
                                    isSelected
                                      ? "bg-purple-700 text-white"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`recipient-${i}`}
                                    value={type}
                                    checked={isSelected}
                                    onChange={() =>
                                      setSelectedRecipient((prev) => ({
                                        ...prev,
                                        [item.awbNumber]: type,
                                      }))
                                    }
                                    className="hidden"
                                  />
                                  {type.charAt(0).toUpperCase() + type.slice(1)}
                                </label>
                              );
                            })}
                          </div>
                        </td>

                        <td className="text-center border  w-[100px] h-[40px]">
                          {selectedRecipient[item.awbNumber] ? (
                            <button
                              onClick={async () => {
                                const recipientPhone =
                                  selectedRecipient[item.awbNumber] ===
                                  "consignor"
                                    ? item.consignorphonenumber
                                    : item.consigneephonenumber;

                                const recipientname =
                                  selectedRecipient[item.awbNumber] ===
                                  "consignor"
                                    ? item.consignorname
                                    : item.consigneename;

                                try {
                                  await Sharetrackinglink({
                                    name: recipientname,
                                    awb: item.awbNumber,
                                    awb: item.awbHashedValue,
                                    mode: item.service,
                                    destination: item.destination,
                                    phone: recipientPhone,
                                    currentStatus:
                                      item?.currentStatus?.toLowerCase(),
                                    packageConnectedDataTime:
                                      item.packageConnectedDataTime,
                                  });
                                } catch (err) {
                                  console.error(
                                    "Error sharing tracking link:",
                                    err,
                                  );
                                }
                              }}
                              className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1"
                              disabled={loading}
                            >
                              {loading ? (
                                <div className="w-4 h-4">
                                  <Lottie
                                    animationData={loadingAnimation}
                                    loop
                                    autoplay
                                  />
                                </div>
                              ) : (
                                "Share"
                              )}
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs">
                              Select first
                            </span>
                          )}
                        </td>

                        <td className="text-[12px]  border px-4 py-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                          {item.currentStatus}
                        </td>
                        <td className="text-[12px] px-4 py-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                          {utilityFunctions.formateFirebaseTimestamp(
                            item.lastStatusUpdated,
                          )}
                        </td>

                        <td className="px-4 py-2  border text-center">
                          <a
                            href={`https://shiphit.com/track-your-courier/${item.awbHashedValue}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-md text-xs font-semibold"
                          >
                            Track
                          </a>
                        </td>

                        <td className="px-4 py-2 text-center">
                          <img
                            className="w-8 cursor-pointer mt-3"
                            src="more-icon.svg"
                            onClick={() => handleMoreIconClick(item)}
                          />
                        </td>

                        {/* -------- Escalation Column -------- */}
                        <td className="px-4 py-2 border text-center">
                          {escStatus === "none" ? (
                            <div className="flex itemscenter justify-center gap-2">
                              <button
                                onClick={() => handleAddReport(item)}
                                className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors duration-200"
                                title="Add escalation report"
                              >
                                Escalate
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <Pill
                                type={
                                  escStatus === "closed" ? "closed" : "pending"
                                }
                              >
                                {escStatus === "closed" ? "Closed" : "Pending"}
                              </Pill>
                              <button
                                onClick={() => handleViewEscalation(item)}
                                className="bg-slate-800 hover:bg-black text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors duration-200"
                                title="View submitted escalation(s)"
                              >
                                View
                              </button>
                            </div>
                          )}
                        </td>
                        {/* -------- Feedback Column -------- */}
                        {role == "Manager" || role == "sales admin" ? (
                          <td className="px-4 py-2 border text-center">
                            {(() => {
                              const fbDoc = feedbackByAwb[fbKey];
                              const ratingValue = fbDoc?.starRatings || 0;

                              return (
                                <button
                                  onClick={() => openFeedbackModal(item)}
                                  className={getFeedbackButtonClasses(
                                    hasFeedback,
                                    ratingValue,
                                  )}
                                  title={
                                    hasFeedback
                                      ? `View Feedback — Rating: ${
                                          ratingValue || "N/A"
                                        }`
                                      : "Add Feedback"
                                  }
                                >
                                  {hasFeedback ? "View" : "Feedback"}
                                </button>
                              );
                            })()}
                          </td>
                        ) : (
                          ""
                        )}
                        {/* -------- End Feedback Column -------- */}
                      </tr>
                    );
                  })
                : null}
            </tbody>
          </table>

          {!dataLoading && filteredPickups.length <= 0 ? (
            <div className="flex p-10 w-full justify-center items-center">
              <span className="font-[12px] text-gray-400">No data</span>
            </div>
          ) : null}
        </div>

        {/* -------- Pagination Controls -------- */}
        {!dataLoading && !awbSearchTerm.trim() && (
          <div className="mt-4 flex items-center justify-between px-1">
            <span className="text-sm text-gray-500">
              Page {currentPage + 1}
            </span>
            <div className="flex gap-3">
              <button
                onClick={goPrevPage}
                disabled={currentPage === 0}
                className="px-4 py-1.5 rounded-md border text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                ← Prev
              </button>
              <button
                onClick={goNextPage}
                disabled={!hasNextPage}
                className="px-4 py-1.5 rounded-md border text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Next →
              </button>
            </div>
          </div>
        )}
        {/* -------- End Pagination Controls -------- */}

        {isModalOpen && selectedPickup && (
          <ShipmentDetails
            selectedPickup={selectedPickup}
            closeModal={closeModal}
          />
        )}
      </div>

      {/* -------- View Escalations Modal -------- */}
      {escModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeEscModal}
        >
          <div
            className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b px-5 py-3 flex items-center justify-between">
              <h3 className="text-lg md:text-xl font-bold text-purple-700">
                Escalations for this AWB
                {escAwb ? (
                  <span className="text-purple-700"> — {escAwb}</span>
                ) : null}
              </h3>
              <button
                onClick={closeEscModal}
                className="bg-red-600 text-white rounded-full w-8 h-8 text-sm font-bold flex items-center justify-center hover:bg-red-700"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[80vh] overflow-y-auto px-5 py-4 space-y-4">
              {escLoading ? (
                <div className="text-center text-gray-600 py-10">Loading…</div>
              ) : escError ? (
                <div className="text-center text-rose-600 py-6">{escError}</div>
              ) : escRows.length === 0 ? (
                <div className="text-center text-gray-600 py-10">
                  No escalations found for this AWB.
                </div>
              ) : (
                escRows.map((r) => {
                  const status = String(r.escalationStatus || "").toLowerCase();
                  const imgs = Array.isArray(r.escalationImages)
                    ? r.escalationImages
                    : [];
                  const cimgs = Array.isArray(r.closureImages)
                    ? r.closureImages
                    : [];

                  // sort updates oldest -> newest
                  const updates = Array.isArray(r.updates)
                    ? [...r.updates].sort(
                        (a, b) =>
                          getMillis(a.createdAt) - getMillis(b.createdAt),
                      )
                    : [];

                  return (
                    <div
                      key={r.id}
                      className="rounded-xl border border-gray-200 shadow-sm p-4"
                    >
                      {/* Top meta row */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                          <span>
                            <span className="font-semibold text-purple-700">
                              Status
                            </span>
                            <span className="text-black"> : </span>
                            <span className="text-black">
                              {status === "pending"
                                ? "Pending"
                                : status === "closed"
                                  ? "Closed"
                                  : "—"}
                            </span>
                          </span>
                          <span>
                            <span className="font-semibold text-purple-700">
                              Category
                            </span>
                            <span className="text-black"> : </span>
                            <span className="text-black">
                              {r.escalationCategory || "-"}
                            </span>
                          </span>
                          <span>
                            <span className="font-semibold text-purple-700">
                              AWB
                            </span>
                            <span className="text-black"> : </span>
                            <span className="text-black">
                              {r.awbNumber || "-"}
                            </span>
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          Created: {formatTS(r.escalationCreatedAt)}
                        </div>
                      </div>

                      {/* Details grid */}
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <Field
                          label="Created By"
                          value={r.escalationCreatedBy || "-"}
                        />
                        <Field label="—" value="" /> {/* spacer */}
                        <Field
                          label="Message"
                          value={r.escalationMessage || "-"}
                          multiline
                        />
                      </div>

                      {/* Submitted Images */}
                      <div className="mt-4">
                        <div className="text-sm font-semibold text-purple-700 mb-1">
                          Submitted Images
                        </div>
                        {imgs.length > 0 ? (
                          <div className="flex flex-wrap gap-3">
                            {imgs.map((src, i2) => (
                              <button
                                key={src + i2}
                                className="w-20 h-20 rounded overflow-hidden border border-gray-200"
                                onClick={() => openLightbox(imgs, i2)}
                                title={`Image ${i2 + 1}`}
                              >
                                <img
                                  src={src}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">
                            No images provided.
                          </div>
                        )}
                      </div>

                      {/* Closed details */}
                      {status === "closed" && (
                        <>
                          <hr className="my-4 border-gray-200" />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                            <Field
                              label="Closed By"
                              value={r.escalationClosedBy || "-"}
                            />
                            <Field
                              label="Closed At"
                              value={formatTS(r.escalationClosedAt)}
                            />
                            <Field
                              label="Closure Note"
                              value={r.closureNote || "-"}
                              multiline
                            />
                          </div>

                          <div className="mt-3">
                            <div className="text-sm font-semibold text-purple-700 mb-1">
                              Closure Images
                            </div>
                            {cimgs.length > 0 ? (
                              <div className="flex flex-wrap gap-3">
                                {cimgs.map((src, i3) => (
                                  <button
                                    key={src + i3}
                                    className="w-20 h-20 rounded overflow-hidden border border-gray-200"
                                    onClick={() => openLightbox(cimgs, i3)}
                                    title={`Closure Image ${i3 + 1}`}
                                  >
                                    <img
                                      src={src}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500">
                                No closure images.
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* -------- Escalation Updates (always shown + auto-scroll to latest) -------- */}
                      <hr className="my-4 border-gray-200" />
                      <div className="mt-2">
                        <div className="text-sm font-semibold text-purple-700 mb-2">
                          Escalation Updates
                        </div>

                        <div
                          className="rounded-xl bg-gray-50 border border-purple-100 px-4 py-3 space-y-3 text-xs max-h-64 overflow-y-auto"
                          ref={(el) => {
                            if (!el) return;
                            // jump to latest update (bottom)
                            el.scrollTop = el.scrollHeight;
                          }}
                        >
                          {updates.length === 0 ? (
                            <div className="text-[12px] text-gray-500 py-1 text-center">
                              No updates are provided.
                            </div>
                          ) : (
                            updates.map((u, idx2) => {
                              const timeLabel = u.createdAt
                                ? formatTime(u.createdAt)
                                : "";
                              const author =
                                u.authorName || u.author || "Unknown user";
                              const roleLabel = u.authorRole || "";

                              const messageText =
                                u.message ||
                                u.note ||
                                (u.from && u.to
                                  ? `Status updated from "${u.from}" to "${u.to}".`
                                  : "Update added.");

                              return (
                                <div key={u.id || idx2} className="flex gap-3">
                                  {/* Timeline rail */}
                                  <div className="flex flex-col items-center mt-1">
                                    <span className="w-2 h-2 rounded-full bg-purple-600 shadow-sm" />
                                    {idx2 !== updates.length - 1 && (
                                      <span className="flex-1 w-px bg-purple-200 mt-1" />
                                    )}
                                  </div>

                                  {/* Card */}
                                  <div className="flex-1 rounded-lg bg-white border border-purple-100 shadow-sm px-3 py-2">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-semibold text-[11px] text-purple-800">
                                        {author}
                                      </span>

                                      {roleLabel && (
                                        <span className="text-[10px] text-gray-500">
                                          ({roleLabel})
                                        </span>
                                      )}

                                      {timeLabel && (
                                        <span className="text-[10px] text-gray-400">
                                          • {timeLabel}
                                        </span>
                                      )}
                                    </div>

                                    <div className="text-[12px] text-gray-900 leading-snug">
                                      {messageText}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                      {/* -------- End Escalation Updates -------- */}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------- FEEDBACK MODAL -------- */}
      {fbModalOpen && fbPickup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b px-5 py-3 flex items-center justify-between">
              <h3 className="text-lg md:text-xl font-bold text-purple-700">
                {fbMode === "view" ? "View Feedback" : "Feedback"} —{" "}
                {fbPickup.awbNumber}
              </h3>
              <button
                onClick={closeFeedbackModal}
                className="bg-red-600 text-white rounded-full w-8 h-8 text-sm font-bold flex items-center justify-center hover:bg-red-700"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <form
              onSubmit={handleFeedbackSubmit}
              className="px-5 py-4 space-y-4"
            >
              {/* Basic shipment info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <Field label="AWB" value={fbPickup.awbNumber} />
                <Field label="Service" value={fbPickup.service} />
                <Field label="Consignor" value={fbPickup.consignorname} />
                <Field
                  label="Consignor No."
                  value={fbPickup.consignorphonenumber}
                />
                <Field label="Consignee" value={fbPickup.consigneename} />
                <Field
                  label="Consignee No."
                  value={fbPickup.consigneephonenumber}
                />
                <Field
                  label="Discount"
                  value={
                    fbForm.discount ||
                    fbPickup.discount ||
                    fbExisting?.discount ||
                    ""
                  }
                />
              </div>

              <hr className="border-gray-200" />

              {/* Feedback fields */}
              <div className="space-y-4">
                {/* Star Rating with SVG stars */}
                <div>
                  <label className="block text-sm font-semibold text-purple-700 mb-1">
                    Star Rating
                  </label>
                  <div className="flex items-center gap-1 mb-1">
                    {[...Array(5)].map((_, i) => {
                      const starIndex = i + 1;
                      const activeValue =
                        fbMode === "add" ? hovered || rating : rating;
                      const isFilled = starIndex <= activeValue;

                      const clickable = fbMode === "add";

                      return (
                        <svg
                          key={i}
                          onClick={
                            clickable ? () => setRating(starIndex) : undefined
                          }
                          onMouseEnter={
                            clickable ? () => setHovered(starIndex) : undefined
                          }
                          onMouseLeave={
                            clickable ? () => setHovered(0) : undefined
                          }
                          className={`w-7 h-7 transition-all duration-300 transform ${
                            clickable ? "cursor-pointer" : "cursor-default"
                          } ${
                            isFilled
                              ? "text-purple-500 scale-110"
                              : "text-white"
                          } ${
                            clickable
                              ? "hover:text-purple-400 hover:scale-125"
                              : ""
                          } fill-current stroke-purple-500 stroke-[1.8]`}
                          viewBox="0 0 24 24"
                        >
                          <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
                        </svg>
                      );
                    })}
                  </div>
                  <div className="text-xs text-gray-600">
                    {rating
                      ? `${rating} / 5`
                      : fbMode === "add"
                        ? "Click on a star to rate"
                        : "No rating"}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-purple-700 mb-1">
                    Comments
                  </label>
                  {fbMode === "view" ? (
                    <p className="inline-block bg-gray-100 text-black px-2 py-1 rounded text-sm font-medium">
                      {fbForm.comments}
                    </p>
                  ) : (
                    <textarea
                      className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600`}
                      rows={3}
                      value={fbForm.comments}
                      onChange={(e) =>
                        fbMode === "add"
                          ? setFbForm((prev) => ({
                              ...prev,
                              comments: e.target.value,
                            }))
                          : null
                      }
                      placeholder="Write your feedback here…"
                    />
                  )}
                </div>

                {/* Discount with toggle */}
                <div>
                  <label className="block text-sm font-semibold text-purple-700 mb-1">
                    Discount
                  </label>

                  {fbMode === "view" ? (
                    <p className="inline-block bg-gray-100 text-black px-2 py-1 rounded text-sm font-medium">
                      {fbForm.discount == null || fbForm.discount === ""
                        ? "-"
                        : fbForm.discount}
                    </p>
                  ) : (
                    <>
                      {/* Toggle row */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs text-gray-600">
                          Apply discount?
                        </span>
                        <button
                          type="button"
                          onClick={() => setDiscountEnabled((prev) => !prev)}
                          className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-200 ${
                            discountEnabled ? "bg-purple-600" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                              discountEnabled
                                ? "translate-x-5"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                        <span className="text-xs text-gray-700">
                          {discountEnabled ? "Yes" : "No"}
                        </span>
                      </div>

                      {/* Discount input only when toggle is YES */}
                      {discountEnabled && (
                        <input
                          type="text"
                          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                          value={fbForm.discount}
                          onChange={(e) =>
                            setFbForm((prev) => ({
                              ...prev,
                              // only digits, max 4 chars
                              discount: e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 4),
                            }))
                          }
                          placeholder="Enter discount (max 4 digits)"
                        />
                      )}
                    </>
                  )}
                </div>

                {fbError && (
                  <div className="text-sm text-rose-600 font-medium">
                    {fbError}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 flex items-center justify-end gap-3">
                {fbMode === "add" ? (
                  <>
                    <button
                      type="button"
                      onClick={closeFeedbackModal}
                      className="px-4 py-1.5 rounded-md border text-sm"
                      disabled={fbSaving}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-md bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold disabled:opacity-60"
                      disabled={fbSaving}
                    >
                      {fbSaving ? "Saving..." : "Save Feedback"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={closeFeedbackModal}
                    className="px-4 py-1.5 rounded-md border text-sm"
                  >
                    Close
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      {/* -------- End Feedback Modal -------- */}

      {/* Lightbox — top-right close, footer controls (no overlay) */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <div
            className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeLightbox}
              className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 text-sm font-bold flex items-center justify-center hover:bg-red-700"
              title="Close"
            >
              ✕
            </button>

            <div className="w-full max-h-[70vh] overflow-hidden flex items-center justify-center pt-6">
              <img
                src={lightboxImages[lightboxIndex]}
                alt=""
                className="max-w-full max-h-[65vh] object-contain rounded"
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setLightboxIndex((i) => Math.max(0, i - 1))}
                disabled={lightboxIndex === 0}
                className="px-3 py-1.5 text-sm rounded border disabled:opacity-50"
              >
                Prev
              </button>
              <div className="text-sm font-medium">
                {lightboxIndex + 1} / {lightboxImages.length}
              </div>
              <button
                onClick={() =>
                  setLightboxIndex((i) =>
                    Math.min(lightboxImages.length - 1, i + 1),
                  )
                }
                disabled={lightboxIndex === lightboxImages.length - 1}
                className="px-3 py-1.5 text-sm rounded border disabled:opacity-50"
              >
                Next
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {lightboxImages.map((src, idx) => (
                <button
                  key={src + idx}
                  onClick={() => setLightboxIndex(idx)}
                  className={`w-16 h-16 rounded overflow-hidden border ${
                    idx === lightboxIndex
                      ? "border-purple-700"
                      : "border-gray-200"
                  }`}
                  title={`Image ${idx + 1}`}
                >
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
