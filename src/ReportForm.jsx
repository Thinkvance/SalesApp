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

  const [escalationCategory, setEscalationCategory] = useState("");
  const [escalationMessage, setEscalationMessage] = useState("");
  const [escalationDateDisplay, setEscalationDateDisplay] = useState("");
  const [escalationStatus, setEscalationStatus] = useState("none");

  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [imageError, setImageError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [categoryError, setCategoryError] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const isView = mode === "view";
  const isAdd = mode === "add";
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

  // Get image limits based on category
  const getImageRules = () => {
    switch (escalationCategory) {
      case "damage":
        return { min: 3, max: 5 };
      case "delay":
        return { min: 0, max: 2 };
      case "missing products":
      case "last mile delivery":
      case "chris cross":
      case "other":
        return { min: 0, max: 2 };
      default:
        return { min: 0, max: 3 };
    }
  };

  // Handle file upload
  const handleFilesSelected = (filesList) => {
    setImageError("");
    if (!filesList || filesList.length === 0) return;

    const { max } = getImageRules();
    const files = Array.from(filesList);
    const currentCount = existingImages.length + newImages.length;
    const remaining = max - currentCount;
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
      setImageError(`Maximum ${max} images allowed for ${escalationCategory}.`);
    }
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
      const path = `escalations/${awbParam}/${Date.now()}_${i}_${file.name}`;
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

    setMessageError("");
    setImageError("");
    setCategoryError("");

    if (!escalationCategory) {
      setCategoryError("Please select a category.");
      return;
    }

    if (escalationMessage.trim().length < 100) {
      setMessageError("Escalation message must be at least 100 characters.");
      return;
    }

    const totalImages = existingImages.length + newImages.length;
    const { min, max } = getImageRules();
    if (totalImages < min) {
      setImageError(
        `Minimum ${min} image(s) required for ${escalationCategory}.`
      );
      return;
    }
    if (totalImages > max) {
      setImageError(`Maximum ${max} images allowed for ${escalationCategory}.`);
      return;
    }

    setSaving(true);
    try {
      const newUrls = await uploadNewImages();
      const finalImages = [...existingImages, ...newUrls];
      const ref = collection(db, "ecalatoins");
      const ref1 = doc(db, DB.db_collection, docId);

      const escalationData = {
        escalatedBoolean: true,
        awbNumber: shipment?.awbNumber || awbParam,
        pickupDocId: docId,
        escalationCategory,
        escalationStatus: "pending",
        escalationMessage: escalationMessage.trim(),
        escalationCreatedAt,
        escalationCreatedBy: username || "",
        escalationImages: finalImages,
      };

      const escalationData1 = {
        escalatedBoolean: true,
        escalationCategory,
        escalationStatus: "pending",
        escalationCreatedAt,
      };

      await addDoc(ref, escalationData);
      await updateDoc(ref1, escalationData1);

      setSubmitted(true);
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
        <SuccessScreen awb={awbParam} />
      ) : shipment?.escalatedBoolean ? (
        <AlreadyEscalatedScreen />
      ) : (
        <div className="max-w-3xl mx-auto p-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-md p-6">
            <h1 className="text-2xl font-bold text-purple-700 mb-6">
              Escalation Report
            </h1>

            {loading && <p className="text-sm text-gray-600 mb-3">Loading…</p>}
            {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}
            {!loading && shipment && (
              <form onSubmit={handleSubmit} className="space-y-3">
                <PairRow label="AWB No" value={shipment.awbNumber} />
                <PairRow
                  label="Consigner Name"
                  value={shipment.consignorname}
                />
                <PairRow
                  label="Consigner Address"
                  value={consignorAddress}
                  multiline
                />
                <PairRow
                  label="Consignee Name"
                  value={shipment.consigneename}
                />
                <PairRow
                  label="Consignee Address"
                  value={consigneeAddress}
                  multiline
                />

                {/* Category dropdown */}
                <div>
                  <div className="text-sm font-semibold text-purple-700">
                    Category <span className="text-rose-600">*</span>
                  </div>
                  <select
                    className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                    value={escalationCategory}
                    onChange={(e) => setEscalationCategory(e.target.value)}
                    required
                  >
                    <option value="">Select Category</option>
                    <option value="delay">Delay</option>
                    <option value="damage">Damage</option>
                    <option value="missing products">Missing Products</option>
                    <option value="last mile delivery">
                      Last Mile Delivery
                    </option>
                    <option value="chris cross">Chris Cross</option>
                    <option value="other">Other</option>
                  </select>

                  {/* Dynamic helper note */}
                  {escalationCategory && (
                    <div className="mt-3 mb-2 px-3 py-2 rounded-lg bg-purple-50 border border-purple-100 text-[13px] text-purple-700">
                      {escalationCategory === "delay" && (
                        <p>
                          📦 <span className="font-semibold">Delay:</span> You
                          may upload up to{" "}
                          <span className="font-semibold">
                            2 optional proof images
                          </span>{" "}
                          showing delay reasons (e.g., weather, route blockage,
                          etc.).
                        </p>
                      )}
                      {escalationCategory === "damage" && (
                        <p>
                          💥 <span className="font-semibold">Damage:</span>{" "}
                          Please upload{" "}
                          <span className="font-semibold">
                            3–5 clear product damage images
                          </span>{" "}
                          to verify the issue.
                        </p>
                      )}
                      {escalationCategory === "missing products" && (
                        <p>
                          📦{" "}
                          <span className="font-semibold">
                            Missing Products:
                          </span>{" "}
                          You may upload up to{" "}
                          <span className="font-semibold">2 proof images</span>{" "}
                          of missing items or package contents.
                        </p>
                      )}
                      {escalationCategory === "last mile delivery" && (
                        <p>
                          🚚{" "}
                          <span className="font-semibold">
                            Last Mile Delivery:
                          </span>{" "}
                          You may upload up to{" "}
                          <span className="font-semibold">2 proof images</span>{" "}
                          related to final delivery issues.
                        </p>
                      )}
                      {escalationCategory === "chris cross" && (
                        <p>
                          🔄 <span className="font-semibold">Chris Cross:</span>{" "}
                          You may upload up to{" "}
                          <span className="font-semibold">2 proof images</span>{" "}
                          showing incorrect shipment routing or swap.
                        </p>
                      )}
                      {escalationCategory === "other" && (
                        <p>
                          📝 <span className="font-semibold">Other:</span> You
                          may upload up to{" "}
                          <span className="font-semibold">
                            2 optional proof images
                          </span>{" "}
                          describing your concern.
                        </p>
                      )}
                    </div>
                  )}

                  {categoryError && (
                    <p className="text-xs text-rose-600 mt-1">
                      {categoryError}
                    </p>
                  )}
                </div>

                {/* Escalation Image Proof */}
                <div className="pt-2">
                  <div className="text-sm font-semibold text-purple-700">
                    Escalation Image Proof{" "}
                    <span className="text-xs text-gray-500 ml-1">
                      (Rules depend on category)
                    </span>
                  </div>

                  {(existingImages.length > 0 || newPreviews.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-3">
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

                  {!isView && (
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

                {/* Escalation Message */}
                <div className="pt-2">
                  <div className="text-sm font-semibold text-purple-700">
                    Escalation Message <span className="text-rose-600">*</span>
                  </div>
                  <textarea
                    rows={4}
                    className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                    placeholder="Describe the issue (at least 100 characters)…"
                    value={escalationMessage}
                    onChange={(e) => setEscalationMessage(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {escalationMessage.trim().length} / 100 characters
                  </p>
                  {messageError && (
                    <p className="text-xs text-rose-600 mt-1">{messageError}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className={`px-4 py-2 rounded-md text-white text-sm font-semibold ${
                      saving ? "bg-gray-400" : "bg-rose-600 hover:bg-rose-700"
                    }`}
                  >
                    {saving ? "Saving…" : "Submit Escalation"}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.close()}
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

// Helper components
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

function Thumb({ src, canRemove, onRemove }) {
  return (
    <div className="relative w-20 h-20 overflow-hidden rounded-md shadow-sm">
      <img src={src} alt="" className="w-full h-full object-cover rounded-md" />
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-0 -right-0 bg-red-600 text-white font-bold rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-700 shadow"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function SuccessScreen({ awb }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 text-white text-center px-6">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-20 w-20 text-white drop-shadow-lg mb-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <h1 className="text-3xl md:text-4xl font-bold mb-3">
        Your escalation was submitted
      </h1>
      <p className="text-lg text-purple-100 max-w-md">
        AWB {awb} has been marked as{" "}
        <span className="font-semibold">Pending</span>.
      </p>
    </div>
  );
}

function AlreadyEscalatedScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900 text-white text-center px-6">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-20 w-20 text-white drop-shadow-lg mb-6"
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
      <h1 className="text-3xl md:text-4xl font-bold mb-3">
        This AWB No was already escalated
      </h1>
      <p className="text-lg text-purple-100 max-w-md">
        An escalation has already been created for this shipment.
      </p>
    </div>
  );
}

function formatAddress(loc) {
  if (!loc) return "";
  if (typeof loc === "string") return loc;
  const parts = [
    loc.address,
    loc.addressLine1 || loc.line1 || loc.street,
    loc.addressLine2 || loc.line2 || loc.area,
    loc.city || loc.town,
    loc.state,
    loc.pincode,
    loc.country,
  ]
    .filter(Boolean)
    .map((x) => String(x).trim());
  return parts.join(", ");
}
