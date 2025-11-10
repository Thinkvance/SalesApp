// ReportForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import DB from "./DB/DB";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

const MAX_IMAGES = 3;
const MAX_MB = 3;
const MAX_BYTES = MAX_MB * 1024 * 1024;

export default function ReportForm() {
  const params = new URLSearchParams(window.location.search);
  const mode = (params.get("mode") || "add").toLowerCase(); // add | view | close
  const awbParam = params.get("awb") || "";

  const [role, setRole] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [docId, setDocId] = useState(null);
  const [shipment, setShipment] = useState(null);

  const [escalationMessage, setEscalationMessage] = useState("");
  const [escalationDateDisplay, setEscalationDateDisplay] = useState("");
  const [escalationStatus, setEscalationStatus] = useState("none");

  // Images
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [imageError, setImageError] = useState("");
  const [messageError, setMessageError] = useState("");

  // Success-screen flag
  const [submitted, setSubmitted] = useState(false);

  const isView = mode === "view";
  const isAdd = mode === "add";   // used for textarea required flag
  const isClose = mode === "close";

  const storage = getStorage();

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("LoginCredentials") || "{}");
    setRole(stored?.role || "");
    setUsername(stored?.name || "");
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (!awbParam) {
          setError("Missing AWB in URL.");
          setLoading(false);
          return;
        }
        const qRef = query(
          collection(db, DB.db_collection),
          where("awbNumber", "==", Number(awbParam))
        );
        const snap = await getDocs(qRef);
        if (snap.empty) {
          setError(`No shipment found for AWB ${awbParam}.`);
          setLoading(false);
          return;
        }
        const docSnap = snap.docs[0];
        const data = docSnap.data();

        setDocId(docSnap.id);
        setShipment(data);

        setEscalationStatus((data.escalationStatus || "none").toLowerCase());
        const existingTime =
          data.escalationCreatedAt?.toDate?.() ??
          data.escalationClosedAt?.toDate?.() ??
          new Date();
        setEscalationDateDisplay(existingTime.toLocaleString());

        setEscalationMessage(
          isClose
            ? ""
            : data.escalationMessage || data.escalationCloseMessage || ""
        );

        setExistingImages(
          Array.isArray(data.escalationImages) ? data.escalationImages : []
        );
      } catch (e) {
        console.error(e);
        setError("Failed to load shipment.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [awbParam, mode]);

  const consignorAddress = useMemo(() => {
    const loc =
      shipment?.consignorlocation ?? shipment?.pickup?.consignorlocation;
    return formatAddress(loc) || shipment?.consignoraddress || "";
  }, [shipment]);

  const consigneeAddress = useMemo(() => {
    const loc =
      shipment?.consigneelocation ?? shipment?.pickup?.consigneelocation;
    return formatAddress(loc) || shipment?.consigneeaddress || "";
  }, [shipment]);

  // Image handlers
  const handleFilesSelected = (filesList) => {
    setImageError("");
    if (!filesList || filesList.length === 0) return;

    const files = Array.from(filesList);
    const currentCount = existingImages.length + newImages.length;
    const remaining = MAX_IMAGES - currentCount;
    const toTake = Math.max(0, Math.min(remaining, files.length));
    const accepted = [];

    for (let i = 0; i < toTake; i++) {
      const f = files[i];
      if (!f.type.startsWith("image/")) continue;
      if (f.size > MAX_BYTES) {
        setImageError(
          `Each image must be ≤ ${MAX_MB} MB. "${f.name}" is too large.`
        );
        continue;
      }
      accepted.push(f);
    }

    const previews = accepted.map((f) => URL.createObjectURL(f));
    setNewImages((p) => [...p, ...accepted]);
    setNewPreviews((p) => [...p, ...previews]);

    if (files.length > toTake) {
      setImageError(`Maximum ${MAX_IMAGES} images allowed.`);
    }
  };

  const removeExistingImage = (index) => {
    const updated = [...existingImages];
    updated.splice(index, 1);
    setExistingImages(updated);
  };

  const removeNewImage = (index) => {
    const updatedNew = [...newImages];
    const updatedPrev = [...newPreviews];
    URL.revokeObjectURL(updatedPrev[index]);
    updatedNew.splice(index, 1);
    updatedPrev.splice(index, 1);
    setNewImages(updatedNew);
    setNewPreviews(updatedPrev);
  };

  const uploadNewImages = async () => {
    const uploaded = [];
    for (let i = 0; i < newImages.length; i++) {
      const file = newImages[i];
      const path = `escalations/escalationClosed/${awbParam}/${Date.now()}_${i}_${file.name}`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, file);
      uploaded.push(await getDownloadURL(ref));
    }
    return uploaded;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const escalationCreatedAt = serverTimestamp();

    if (!docId) return;

    // ——— Validations only for "Save as Pending" (add mode) ———
    setMessageError("");
    setImageError("");

    if (!isClose) {
      // 1) Min 100 chars
      if (escalationMessage.trim().length < 100) {
        setMessageError("Escalation message must be at least 100 characters.");
        return;
      }
      // 2) Min 1 image (existing + new)
      const totalBeforeUpload = existingImages.length + newImages.length;
      if (totalBeforeUpload < 1) {
        setImageError("Please add at least 1 proof image.");
        return;
      }
    }

    // Global max images check
    const total = existingImages.length + newImages.length;
    if (total > MAX_IMAGES) {
      setImageError(`Maximum ${MAX_IMAGES} images allowed.`);
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // 1) New escalation doc in "ecalatoins"
      const ref = collection(db, "ecalatoins");
      // 2) Update the related pickup doc in your main collection
      const ref1 = doc(db, DB.db_collection, docId);

      // Upload new images
      const newUrls = await uploadNewImages();
      const finalImages = [...existingImages, ...newUrls];

      // Data for new escalation record
      const escalationData = {
        escalatedBoolean: true,
        awbNumber: shipment?.awbNumber || awbParam,
        pickupDocId: docId, // link to pickup record
        escalationStatus: isClose ? "closed" : "pending",
        escalationMessage: escalationMessage?.trim() || "",
        escalationCreatedAt,
        escalationCreatedBy: username || "",
        escalationImages: finalImages,
      };

      // Data to stamp on pickup doc
      const escalationData1 = {
        escalatedBoolean: true,
        shipmentDocId: docId,
        escalationStatus: isClose ? "closed" : "pending",
        escalationCreatedAt,
      };

      // Add escalation record
      await addDoc(ref, escalationData);

      // Update pickup doc
      await updateDoc(ref1, escalationData1);

      // Clear previews
      setNewImages([]);
      newPreviews.forEach((u) => URL.revokeObjectURL(u));
      setNewPreviews([]);

      // Success screen
      setSubmitted(true);
      window.scrollTo(0, 0);
    } catch (e) {
      console.error(e);
      setError("Failed to create new escalation document.");
    } finally {
      setSaving(false);
    }
  };

  // ---------- RENDER ----------
  return (
    <div className="min-h-screen bg-gray-50">
      {submitted ? (
        // ✅ Success screen after submission
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 text-white text-center px-6">
          <div className="mb-6 bg-white/10 p-6 rounded-full shadow-lg backdrop-blur-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-20 w-20 text-white drop-shadow-lg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Your escalation was submitted
          </h1>
          <p className="text-lg text-purple-100 max-w-md">
            AWB {awbParam} has been marked as{" "}
            <span className="font-semibold">{isClose ? "Closed" : "Pending"}</span>.
          </p>
        </div>
      ) : shipment?.escalatedBoolean ? (
        // ✅ Already escalated view (purple gradient)
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 text-white text-center px-6">
          <div className="mb-6 bg-white/10 p-6 rounded-full shadow-lg backdrop-blur-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-20 w-20 text-white drop-shadow-lg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            This AWB No was already escalated
          </h1>
          <p className="text-lg text-purple-100 max-w-md">
            An escalation has already been created for this shipment.
            Please check the escalation record or contact your manager for updates.
          </p>
        </div>
      ) : (
        // ✅ Form view
        <div className="max-w-3xl mx-auto p-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-md p-6">
            <h1 className="text-2xl font-bold text-purple-700 mb-6">
              Escalation Report
            </h1>

            {loading && <p className="text-sm text-gray-600 mb-3">Loading…</p>}
            {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}
            {success && <p className="text-sm text-green-700 mb-3">{success}</p>}

            {!loading && shipment && (
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Read-only rows */}
                <PairRow label="AWB No" value={shipment.awbNumber} />
                <PairRow label="Consigner Name" value={shipment.consignorname} />
                <PairRow label="Consigner Address" value={consignorAddress} multiline />
                <PairRow label="Consigner Phone No" value={shipment.consignorphonenumber} />
                <PairRow label="Consignee Name" value={shipment.consigneename} />
                <PairRow label="Consignee Address" value={consigneeAddress} multiline />
                <PairRow label="Consignee Phone No" value={shipment.consigneephonenumber} />
                <PairRow label="Pickup Booked By" value={shipment.pickupBookedBy} />
                {/* Optional date/time row */}
                {/* <PairRow label="Escalation Date and Time" value={escalationDateDisplay} /> */}

                {/* Escalation Image Proof */}
                <div className="pt-2">
                  <div className="text-sm font-semibold text-purple-700">
                    Escalation Image Proof <span className="text-black">:</span>{" "}
                    <span className="text-xs text-gray-500 align-middle">
                      (Max {MAX_IMAGES} images, ≤ {MAX_MB} MB each)
                    </span>
                  </div>

                  {(existingImages.length > 0 || newPreviews.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-3">
                      {existingImages.map((url, idx) => (
                        <Thumb
                          key={url + idx}
                          src={url}
                          canRemove={!isView}
                          onRemove={() => removeExistingImage(idx)}
                        />
                      ))}
                      {newPreviews.map((src, idx) => (
                        <Thumb
                          key={src + idx}
                          src={src}
                          canRemove={!isView}
                          onRemove={() => removeNewImage(idx)}
                        />
                      ))}
                    </div>
                  )}

                  {!isView && !(isClose && role !== "Manager") && (
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFilesSelected(e.target.files)}
                      className="mt-2 text-sm text-gray-800"
                    />
                  )}
                  {imageError && (
                    <p className="text-xs text-rose-600 mt-1">{imageError}</p>
                  )}
                </div>

                {/* Escalation Message (only editable text field) */}
                <div className="pt-2">
                  <div className="text-sm font-semibold text-purple-700">
                    {isClose ? "Closure Note" : "Escalation Message"}{" "}
                    <span className="text-black">:</span>
                  </div>
                  <textarea
                    rows={4}
                    className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                    placeholder={
                      isClose ? "Add resolution note…" : "Describe the issue…"
                    }
                    value={escalationMessage}
                    onChange={(e) => setEscalationMessage(e.target.value)}
                    disabled={isView || (isClose && role !== "Manager")}
                    required={isAdd || isClose}
                  />
                  {/* live counter for user clarity */}
                  <p className="text-xs text-gray-500 mt-1">
                    {escalationMessage.trim().length} / 100 characters
                  </p>
                  {messageError && (
                    <p className="text-xs text-rose-600 mt-1">{messageError}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  {!isView && (
                    <button
                      type="submit"
                      disabled={
                        saving || (isClose && role !== "Manager") || loading
                      }
                      className={`px-4 py-2 rounded-md text-white text-sm font-semibold ${
                        isClose
                          ? "bg-slate-800 hover:bg-black"
                          : "bg-rose-600 hover:bg-rose-700"
                      } disabled:opacity-60`}
                    >
                      {saving
                        ? "Saving…"
                        : isClose
                        ? "Mark as Closed"
                        : "Save as Pending"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      window.close();
                      setTimeout(() => {
                        try {
                          window.open("", "_self");
                          window.close();
                        } catch {}
                      }, 150);
                    }}
                    className="px-4 py-2 rounded-md border text-sm text-gray-700 bg-gray-100 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** One-line row: "Label : Value" */
function PairRow({ label, value, multiline = false }) {
  return (
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
}

/** Red-X thumbnail (adjust -top-0/-right-0 to position) */
function Thumb({ src, canRemove, onRemove }) {
  return (
    <div className="relative w-20 h-20 overflow-hidden rounded-md shadow-sm">
      <img src={src} alt="" className="w-full h-full object-cover rounded-md" />
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-0 -right-0 bg-red-600 text-white font-bold rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-700 shadow"
          title="Remove"
        >
          ✕
        </button>
      )}
    </div>
  );
}

/** Address builder */
function formatAddress(loc) {
  if (!loc) return "";
  if (typeof loc === "string") return loc;
  const parts = [
    loc.address,
    loc.addressLine1 || loc.address1 || loc.line1 || loc.street,
    loc.addressLine2 || loc.address2 || loc.line2 || loc.area,
    loc.landmark,
    loc.city || loc.district || loc.town,
    loc.state || loc.province,
    loc.pincode || loc.postalCode || loc.zipcode || loc.zip,
    loc.country,
  ]
    .filter(Boolean)
    .map((x) => String(x).trim());
  return parts.join(", ");
}
