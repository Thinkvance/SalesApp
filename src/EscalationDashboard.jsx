// EscalationDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import DB from "./DB/DB";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import Nav from "./Nav";

const MAX_IMAGES = 3;
const MAX_MB = 3;
const MAX_BYTES = MAX_MB * 1024 * 1024;

const StatusPill = ({ status }) => {
  const s = String(status || "none").toLowerCase();
  const map = {
    pending: "bg-yellow-100 text-yellow-800",
    closed: "bg-green-100 text-green-800",
    none: "bg-gray-100 text-gray-700",
  };
  return (
    <span
      className={`px-2 py-1 rounded text-[11px] font-medium ${
        map[s] || map.none
      }`}
    >
      {s[0]?.toUpperCase() + s.slice(1)}
    </span>
  );
};

export default function EscalationDashboard() {
  const [role, setRole] = useState("");
  const [username, setUsername] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("pending"); // all | pending | closed
  const [awbSearch, setAwbSearch] = useState("");

  // Modal + details
  const [modalOpen, setModalOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [shipment, setShipment] = useState(null);

  // Lightbox (submitted images)
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Close inputs & validation
  const [closeNote, setCloseNote] = useState("");
  const [closeNewImages, setCloseNewImages] = useState([]);
  const [closePreviews, setClosePreviews] = useState([]);
  const [imgError, setImgError] = useState("");
  const [noteError, setNoteError] = useState("");
  const [closing, setClosing] = useState(false);

  // Flash banner on success
  const [flash, setFlash] = useState("");

  const storage = getStorage();

  // Load user
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("LoginCredentials") || "{}");
    setRole(stored?.role || "");
    setUsername(stored?.name || "");
  }, []);

  // normalized role helpers
  const roleLower = String(role || "").toLowerCase();
  const isPrivileged = roleLower === "manager" || roleLower === "sales admin";
  const isManager = roleLower === "manager";

  // Subscribe to escalations; order OLDEST FIRST (asc) — available to Manager + Sales Admin
  useEffect(() => {
    if (!role) return;
    if (!isPrivileged) {
      // Non-privileged users do not load escalations
      setLoading(false);
      return;
    }
    const base = collection(db, "ecalatoins");
    const qRef = query(base, orderBy("escalationCreatedAt", "asc"));
    const unsub = onSnapshot(
      qRef,
      (snap) => {
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("Failed to fetch escalations:", err);
        setRows([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [role, isPrivileged]);

  // Lock background scroll for modal
  useEffect(() => {
    if (modalOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => (document.body.style.overflow = "");
  }, [modalOpen]);

  // Auto-hide flash after 4s
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(""), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  // helper to get millis safely for client-side sort
  const getMillis = (ts) => {
    try {
      const d = ts?.toDate?.();
      if (d) return d.getTime();
      const n = new Date(ts).getTime();
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  };

  const filtered = useMemo(() => {
    const s = awbSearch.trim().toLowerCase();
    const res = rows
      .filter((r) => {
        if (statusFilter === "all") return true;
        return String(r.escalationStatus || "").toLowerCase() === statusFilter;
      })
      .filter((r) =>
        String(r.awbNumber || "")
          .toLowerCase()
          .includes(s)
      );

    // safety-net sort: OLDEST FIRST
    res.sort(
      (a, b) =>
        getMillis(a.escalationCreatedAt) - getMillis(b.escalationCreatedAt)
    );
    return res;
  }, [rows, statusFilter, awbSearch]);

  // Open modal, load shipment, prep images
  const handleView = async (row) => {
    setActiveRow(row);
    setShipment(null);
    setCloseNote("");
    setCloseNewImages([]);
    closePreviews.forEach((u) => URL.revokeObjectURL(u));
    setClosePreviews([]);
    setImgError("");
    setNoteError("");

    const imgs = Array.isArray(row.escalationImages)
      ? row.escalationImages
      : [];
    setLightboxImages(imgs);
    setLightboxIndex(0);

    try {
      const shipId = row.pickupDocId || row.shipmentDocId;
      if (shipId) {
        const shipRef = doc(db, DB.db_collection, shipId);
        const snap = await getDoc(shipRef);
        if (snap.exists()) setShipment(snap.data());
      }
    } catch (e) {
      console.warn("Failed to load shipment for escalation:", e);
    }

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    closePreviews.forEach((u) => URL.revokeObjectURL(u));
  };

  // File handlers (closure proof)
  const handleFilesSelected = (filesList) => {
    setImgError("");
    if (!filesList || filesList.length === 0) return;

    const files = Array.from(filesList);
    const remaining = MAX_IMAGES - closeNewImages.length;
    const take = Math.max(0, Math.min(remaining, files.length));

    const accepted = [];
    const previews = [];
    for (let i = 0; i < take; i++) {
      const f = files[i];
      if (!f.type.startsWith("image/")) continue;
      if (f.size > MAX_BYTES) {
        setImgError(
          `Each image must be ≤ ${MAX_MB} MB. "${f.name}" is too large.`
        );
        continue;
      }
      accepted.push(f);
      previews.push(URL.createObjectURL(f));
    }

    setCloseNewImages((p) => [...p, ...accepted]);
    setClosePreviews((p) => [...p, ...previews]);

    if (files.length > take)
      setImgError(`Maximum ${MAX_IMAGES} images allowed.`);
  };

  const removeCloseImage = (i) => {
    const n = [...closeNewImages];
    const p = [...closePreviews];
    URL.revokeObjectURL(p[i]);
    n.splice(i, 1);
    p.splice(i, 1);
    setCloseNewImages(n);
    setClosePreviews(p);
  };

  const uploadClosureImages = async (awb) => {
    const urls = [];
    for (let i = 0; i < closeNewImages.length; i++) {
      const file = closeNewImages[i];
      const path = `escalations/${awb}/closure/${Date.now()}_${i}_${file.name}`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, file);
      urls.push(await getDownloadURL(ref));
    }
    return urls;
  };

  // Validation: min 100 chars note + min 1 image
  const canClose =
    isManager &&
    String(activeRow?.escalationStatus || "").toLowerCase() === "pending" &&
    closeNewImages.length >= 1;

  const handleCloseSubmit = async () => {
    const length = closeNote.trim().length;
    if (length < 15 || length > 200) {
      setNoteError("Description must be between 15 and 200 characters.");
      return;
    } else {
      setNoteError("");
    }

    if (closeNewImages.length < 1) {
      setImgError("Please upload at least one proof image.");
      return;
    } else setImgError("");

    try {
      setClosing(true);
      const awb = activeRow?.awbNumber || "";
      const escId = activeRow?.id;
      if (!escId) throw new Error("Missing escalation doc id");

      // Upload closure images
      const closureImages = await uploadClosureImages(awb);

      // Update escalation doc
      const escRef = doc(db, "ecalatoins", escId);
      await updateDoc(escRef, {
        escalationStatus: "closed",
        closureNote: closeNote.trim(),
        closureImages,
        escalationClosedAt: new Date(),
        escalationClosedBy: username || "",
      });

      // Update linked shipment (so My Shipments shows Closed)
      const shipId = activeRow?.pickupDocId || activeRow?.shipmentDocId;
      if (shipId) {
        try {
          const shipRef = doc(db, DB.db_collection, shipId);
          const exists = await getDoc(shipRef);
          if (exists.exists()) {
            await updateDoc(shipRef, {
              escalatedBoolean: true,
              escalationStatus: "closed",
              escalationClosedAt: new Date(),
              escalationClosedBy: username || "",
            });
          }
        } catch (e) {
          console.warn("Shipment update failed (non-blocking):", e);
        }
      }

      setFlash(`Escalation for AWB ${awb} was closed successfully.`);
      closeModal();
    } catch (e) {
      console.error("Failed to close escalation:", e);
      alert("Failed to close escalation. Please try again.");
    } finally {
      setClosing(false);
    }
  };

  if (!role) {
    return <div className="p-6 text-sm text-gray-600">Loading user…</div>;
  }
  if (!isPrivileged) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="rounded-xl border bg-white shadow p-8 text-center max-w-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Access Restricted
          </h2>
          <p className="text-gray-600">
            This dashboard and closed-report access is only available to
            Managers and Sales Admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Nav />
      <div className="p-6">
        <h1 className="text-2xl font-bold text-purple-700 mb-4">
          Escalation Dashboard
        </h1>
        {/* Success flash */}
        {flash && (
          <div className="mb-4 rounded-xl shadow bg-gradient-to-r from-purple-600 to-purple-800 text-white px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">{flash}</span>
            <button
              onClick={() => setFlash("")}
              className="text-white/90 hover:text-white underline text-xs"
              aria-label="Dismiss"
            >
              Dismiss
            </button>
          </div>
        )}
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            {/* Quick filters including "Closed Reports" (closed only shown to privileged users) */}
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${
                statusFilter === "pending"
                  ? "bg-purple-700 text-white border-purple-700"
                  : "bg-white text-gray-700"
              }`}
            >
              Pending
            </button>

            {isPrivileged && (
              <button
                onClick={() => setStatusFilter("closed")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${
                  statusFilter === "closed"
                    ? "bg-purple-700 text-white border-purple-700"
                    : "bg-white text-gray-700"
                }`}
                title="Closed report information"
              >
                Closed Reports
              </button>
            )}

            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${
                statusFilter === "all"
                  ? "bg-purple-700 text-white border-purple-700"
                  : "bg-white text-gray-700"
              }`}
            >
              All
            </button>
          </div>

          <input
            type="text"
            placeholder="Search by AWB"
            value={awbSearch}
            onChange={(e) => setAwbSearch(e.target.value)}
            className="border border-gray-300 rounded py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
        {/* Table (Images column removed) */}
        <div className="overflow-x-auto border rounded-lg shadow">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-purple-700 text-white text-left">
              <tr>
                {[
                  "AWB",
                  "Status",
                  "Created At",
                  "Created By",
                  "Message",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="py-3 px-4 whitespace-nowrap font-medium border"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    No escalations found.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b hover:bg-gray-50 transition"
                    onClick={() => handleView(row)}
                  >
                    <td className="px-4 py-2">{row.awbNumber || "-"}</td>
                    <td className="px-4 py-2">
                      <StatusPill status={row.escalationStatus} />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {formatTimestamp(row.escalationCreatedAt)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {row.escalationCreatedBy || "-"}
                    </td>
                    <td className="px-4 py-2 max-w-[320px]">
                      <span
                        title={row.escalationMessage || ""}
                        className="line-clamp-2"
                      >
                        {row.escalationMessage || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {String(row.escalationStatus).toLowerCase() ===
                      "pending" ? (
                        isManager ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleView(row);
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold"
                            title="Close escalation"
                          >
                            Close
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleView(row);
                            }}
                            className="bg-slate-800 hover:bg-black text-white px-3 py-1.5 rounded-md text-xs font-semibold"
                            title="View escalation"
                          >
                            View
                          </button>
                        )
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleView(row);
                          }}
                          className="bg-slate-800 hover:bg-black text-white px-3 py-1.5 rounded-md text-xs font-semibold"
                          title="View escalation"
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Modal */}
        {modalOpen && activeRow && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            // onClick={closeModal}
          >
            <div
              className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 bg-white border-b px-5 py-3 flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-bold text-purple-700">
                  Escalation — AWB {activeRow.awbNumber || "-"}
                </h2>
                <button
                  onClick={closeModal}
                  className="bg-red-600 text-white rounded-full w-8 h-8 text-sm font-bold flex items-center justify-center hover:bg-red-700"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable content */}
              <div className="max-h-[80vh] overflow-y-auto px-5 py-4 space-y-6">
                {/* Submitted escalation core */}
                <section className="space-y-2">
                  <Info
                    label="Escalation Category"
                    value={String(activeRow.escalationCategory || "-")}
                  />
                  <Info
                    label="Status"
                    value={String(activeRow.escalationStatus || "-")}
                  />
                  <Info
                    label="Created At"
                    value={formatTimestamp(activeRow.escalationCreatedAt)}
                  />
                  <Info
                    label="Created By"
                    value={activeRow.escalationCreatedBy || "-"}
                  />
                  <Info
                    label="Escalation Message"
                    value={activeRow.escalationMessage || "-"}
                    multiline
                  />
                  <hr className="border-gray-200" />
                </section>

                {/* Shipment details */}
                <section>
                  <h3 className="text-lg font-semibold text-purple-700 mb-3">
                    Shipment Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    <Info
                      label="Consignor Name"
                      value={shipment?.consignorname || "-"}
                    />
                    <Info
                      label="Consignor Phone No"
                      value={shipment?.consignorphonenumber || "-"}
                    />
                    <Info
                      label="Consignee Name"
                      value={shipment?.consigneename || "-"}
                    />
                    <Info
                      label="Consignee Phone No"
                      value={shipment?.consigneephonenumber || "-"}
                    />
                    <Info
                      label="Destination"
                      value={shipment?.destination || "-"}
                    />
                    <Info label="Vendor" value={shipment?.vendorName || "-"} />
                    <Info label="Service" value={shipment?.service || "-"} />
                    <div className="flex items-center gap-3 bg-gray-50 border border-purple-200 rounded-xl px-4 py-2 w-fit shadow-sm">
                      <span className="font-semibold text-purple-700 text-base">
                        Escalation Category:
                      </span>
                      <p
                        className={`text-base px-3 py-1 rounded-md text-white font-medium ${
                          shipment?.escalationCategory
                            ? "bg-red-500"
                            : "bg-gray-400"
                        }`}
                      >
                        {shipment?.escalationCategory || "Not Assigned"}
                      </p>
                    </div>
                  </div>
                  <hr className="mt-4 border-gray-200" />
                </section>

                {/* Submitted images */}
                <section>
                  <h3 className="text-lg font-semibold text-purple-700 mb-2">
                    Submitted Images
                  </h3>
                  {lightboxImages.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {lightboxImages.map((src, idx) => (
                        <button
                          key={src + idx}
                          className={`w-20 h-20 rounded overflow-hidden border ${
                            idx === lightboxIndex
                              ? "border-purple-700"
                              : "border-gray-200"
                          }`}
                          onClick={() => {
                            setLightboxIndex(idx);
                            setLightboxOpen(true);
                          }}
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
                  ) : (
                    <div className="text-xs text-gray-500">
                      No images provided.
                    </div>
                  )}
                  <hr className="mt-4 border-gray-200" />
                </section>

                {/* Close section (Manager only + pending) */}
                {String(activeRow.escalationStatus || "").toLowerCase() ===
                  "pending" &&
                  isManager && (
                    <section>
                      <h3 className="text-lg font-semibold text-purple-700 mb-2">
                        Close Escalation
                      </h3>

                      {/* Description to close (min 100 chars) */}
                      <div className="mb-3">
                        <div className="text-sm font-semibold text-purple-700">
                          Description to Close{" "}
                          <span className="text-rose-600">*</span>
                        </div>
                        <textarea
                          rows={4}
                          className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                          placeholder="Write at least 15 characters describing the resolution / action taken…"
                          value={closeNote}
                          onChange={(e) => setCloseNote(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {closeNote.trim().length} / 200 characters
                        </p>
                        {noteError && (
                          <div className="text-xs text-rose-600 mt-1">
                            {noteError}
                          </div>
                        )}
                      </div>

                      {/* Proof Images (min 1) */}
                      <div className="mb-3">
                        <div className="text-sm font-semibold text-purple-700">
                          Proof Images <span className="text-rose-600">*</span>
                          <span className="text-xs text-gray-500 ml-1">
                            (Min 1, Max {MAX_IMAGES}, ≤ {MAX_MB}MB each)
                          </span>
                        </div>

                        {closePreviews.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-3">
                            {closePreviews.map((src, idx) => (
                              <div
                                key={src + idx}
                                className="relative w-20 h-20"
                              >
                                <img
                                  src={src}
                                  alt=""
                                  className="w-full h-full rounded object-cover border"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeCloseImage(idx)}
                                  className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs font-bold flex items-center justify-center hover:bg-red-700"
                                  title="Remove"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="mt-2 text-sm"
                          onChange={(e) => handleFilesSelected(e.target.files)}
                        />
                        {imgError && (
                          <div className="text-xs text-rose-600 mt-1">
                            {imgError}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          disabled={!canClose || closing}
                          onClick={handleCloseSubmit}
                          className={`px-4 py-2 rounded-md text-white text-sm font-semibold ${
                            !canClose || closing
                              ? "bg-gray-300 cursor-not-allowed"
                              : "bg-rose-600 hover:bg-rose-700"
                          }`}
                        >
                          {closing ? "Closing…" : "Mark as Closed"}
                        </button>
                        <button
                          type="button"
                          onClick={closeModal}
                          className="px-4 py-2 rounded-md border text-sm text-gray-700 bg-gray-100 hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </section>
                  )}
              </div>
            </div>
          </div>
        )}
        {/* Lightbox — close at top-right, Prev/Next in footer (no overlay) */}
        {lightboxOpen && (
          <div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setLightboxOpen(false)}
          >
            <div
              className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full p-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button top-right */}
              <button
                onClick={() => setLightboxOpen(false)}
                className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 text-sm font-bold flex items-center justify-center hover:bg-red-700"
                title="Close"
              >
                ✕
              </button>

              {/* Image area */}
              <div className="w-full max-h-[70vh] overflow-hidden flex items-center justify-center pt-6">
                <img
                  src={lightboxImages[lightboxIndex]}
                  alt=""
                  className="max-w-full max-h-[65vh] object-contain rounded"
                />
              </div>

              {/* Footer controls to avoid overlay */}
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
                      Math.min(lightboxImages.length - 1, i + 1)
                    )
                  }
                  disabled={lightboxIndex === lightboxImages.length - 1}
                  className="px-3 py-1.5 text-sm rounded border disabled:opacity-50"
                >
                  Next
                </button>
              </div>

              {/* Thumbs row */}
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
      </div>
    </div>
  );
}

function Info({ label, value, multiline }) {
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

function formatTimestamp(ts) {
  try {
    const d = ts?.toDate?.() || null;
    if (!d) return "-";
    return d.toLocaleString();
  } catch {
    return "-";
  }
}
