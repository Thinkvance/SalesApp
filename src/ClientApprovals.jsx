import React, { useEffect, useState } from "react";
import {
  collection,
  doc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import { FaEye, FaCheck, FaXmark } from "react-icons/fa6";
import Nav from "./Nav";

function ClientApprovals() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Detail modal
  const [viewClient, setViewClient] = useState(null);

  // Approval modal
  const [selectedClient, setSelectedClient] = useState(null);
  const [actionType, setActionType] = useState(null); // APPROVE | REJECT
  const [note, setNote] = useState("");

  const user = JSON.parse(localStorage.getItem("LoginCredentials"));

  // 🔥 Realtime Firestore listener
  useEffect(() => {
    const q = query(
      collection(db, "ClientOnboarding"),
      orderBy("createdAt", "desc"),
    );

    const unsub = onSnapshot(q, (snap) => {
      setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // 🌍 Open Google Maps
  const openInMap = (coordinates) => {
    if (!coordinates) return;
    const [lat, lng] = coordinates.split(",").map((v) => v.trim());
    if (!lat || !lng) return;
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  // ✅ Approve / Reject
  const updateStatus = async () => {
    if (!note.trim()) return;

    await updateDoc(doc(db, "ClientOnboarding", selectedClient.id), {
      status: actionType === "APPROVE" ? "APPROVED" : "REJECTED",
      isApproved: actionType === "APPROVE",

      approvedAt: actionType === "APPROVE" ? serverTimestamp() : null,
      approvedBy: actionType === "APPROVE" ? user.email : null,

      rejectedAt: actionType === "REJECT" ? serverTimestamp() : null,
      rejectedBy: actionType === "REJECT" ? user.email : null,

      rejectionReason: actionType === "REJECT" ? note : null,

      lastUpdatedAt: serverTimestamp(),
      lastUpdatedBy: user.email,
    });

    setSelectedClient(null);
    setActionType(null);
    setNote("");
  };

  if (loading) {
    return <p className="p-6 text-gray-500">Loading clients…</p>;
  }

  return (
    <div>
      <Nav />

      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl border shadow-sm">
          {/* Header */}
          <div className="px-6 py-4 border-b rounded-t-2xl bg-purple-50 flex justify-between">
            <h2 className="text-lg font-bold text-purple-900">
              Client Approvals
            </h2>
            <span className="text-sm text-purple-700">
              Pending: {clients.filter((c) => c.status === "PENDING").length}
            </span>
          </div>

          {/* Table */}

          {clients.length === 0 ? (
            <EmptyState
              title="No client profiles found"
              description="Once clients are onboarded, they will appear here for approval."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-purple-50 text-purple-800 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left">Company</th>
                    <th className="px-6 py-3 text-left">Created By</th>
                    <th className="px-6 py-3 text-left">City</th>
                    <th className="px-6 py-3 text-left">Created On</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {clients.map((client) => (
                    <tr
                      key={client.id}
                      onClick={() => setViewClient(client)}
                      className="border-b hover:bg-purple-50/50 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold">
                          {client.companyName}
                        </div>
                        <div className="text-xs text-purple-600">
                          Ref: {client.referenceCode}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div>{client.CreatedBy}</div>
                        <div className="text-xs text-gray-500">
                          {client.CreatedByEmail}
                        </div>
                      </td>

                      <td className="px-6 py-4">{client.city}</td>

                      <td className="px-6 py-4">
                        {client.createdAt?.toDate?.().toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold
                        ${
                          client.status === "APPROVED"
                            ? "bg-green-100 text-green-700"
                            : client.status === "REJECTED"
                              ? "bg-red-100 text-red-700"
                              : "bg-purple-100 text-purple-700"
                        }`}
                        >
                          {client.status}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-4">
                          <FaEye
                            className="text-purple-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewClient(client);
                            }}
                          />

                          {client.status === "PENDING" && (
                            <>
                              <FaCheck
                                className="text-green-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedClient(client);
                                  setActionType("APPROVE");
                                }}
                              />
                              <FaXmark
                                className="text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedClient(client);
                                  setActionType("REJECT");
                                }}
                              />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* APPROVE / REJECT MODAL */}
        {selectedClient && (
          <Overlay onClose={() => setSelectedClient(null)}>
            <h3 className="text-lg font-bold text-purple-900">
              {actionType === "APPROVE" ? "Approve Client" : "Reject Client"}
            </h3>

            <p className="text-sm text-gray-500 mb-4">
              {selectedClient.companyName} • {selectedClient.referenceCode}
            </p>

            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-400"
              placeholder="Note is required"
            />

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSelectedClient(null)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={!note.trim()}
                onClick={updateStatus}
                className={`px-5 py-2 rounded-lg text-white ${
                  actionType === "APPROVE" ? "bg-green-600" : "bg-red-600"
                }`}
              >
                Confirm
              </button>
            </div>
          </Overlay>
        )}

        {/* DETAILS MODAL (FULL & SINGLE) */}
        {viewClient && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
              {/* Header */}
              <div className="px-6 py-4 border-b flex justify-between items-center bg-purple-50">
                <div>
                  <h3 className="text-xl font-bold text-purple-900">
                    {viewClient.companyName}
                  </h3>
                  <p className="text-sm text-purple-700">
                    Ref: {viewClient.referenceCode}
                  </p>
                </div>

                <button
                  onClick={() => setViewClient(null)}
                  className="text-gray-500 hover:text-black text-xl"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-8 text-sm">
                {/* Created By */}
                <Section title="Created By">
                  <KV label="Name" value={viewClient.CreatedBy} />
                  <KV label="Role" value={viewClient.CreatedByRole} />
                  <KV label="Email" value={viewClient.CreatedByEmail} />
                  <KV label="Location" value={viewClient.CreatedByLocation} />
                  <KV
                    label="Created At"
                    value={viewClient.createdAt?.toDate?.().toLocaleString()}
                  />
                </Section>

                {/* Pickup / Consignor */}
                <Section title="Pickup / Consignor Details">
                  <KV label="Consignor Name" value={viewClient.consignorName} />
                  <KV label="Phone" value={viewClient.consignorPhone} />
                  <KV label="Address" value={viewClient.consignorAddress} />
                  <KV label="City" value={viewClient.city} />
                  <KV label="Pincode" value={viewClient.pincode} />
                  <KV label="Pickup Area" value={viewClient.pickupArea} />
                  <KV
                    label="Coordinates"
                    value={viewClient.coordinates}
                    openInMap={openInMap}
                  />
                  <KV
                    label="Special Instructions"
                    value={viewClient.specialInstructions}
                    full
                  />
                </Section>

                {/* Billing */}
                <Section title="Billing Details">
                  <KV
                    label="Billing Company"
                    value={viewClient.billingCompanyName}
                  />
                  <KV label="GST Number" value={viewClient.GSTNumber} />
                  <KV label="GST State" value={viewClient.GSTState} />
                  <KV
                    label="Billing Address"
                    value={viewClient.billingAddress}
                    full
                  />
                </Section>

                {/* Business */}
                <Section title="Business Commitment">
                  <KV
                    label="Shipments / Month"
                    value={viewClient.shipmentsCommitment}
                  />
                  <KV
                    label="Volume Commitment"
                    value={viewClient.volumeCommitment}
                  />
                  <KV
                    label="Frequent Countries"
                    value={viewClient.frequentCountries?.join(", ")}
                    full
                  />
                </Section>

                {/* Documents */}
                <Section title="Documents">
                  <KV
                    label="KYC Document"
                    value={
                      <a
                        href={viewClient.kycFileUrl}
                        target="_blank"
                        className="text-purple-600 underline"
                      >
                        View
                      </a>
                    }
                  />
                  <KV
                    label="Rate Card"
                    value={
                      <a
                        href={viewClient.rateCardFileUrl}
                        target="_blank"
                        className="text-purple-600 underline"
                      >
                        View
                      </a>
                    }
                  />
                </Section>

                {/* Approval Status */}
                <Section title="Approval Status">
                  <KV label="Status" value={viewClient.status} />

                  {viewClient.approvedBy && (
                    <KV
                      label="Approved By"
                      value={`${viewClient.approvedBy} (${viewClient.approvedAt
                        ?.toDate?.()
                        .toLocaleString()})`}
                      full
                    />
                  )}

                  {viewClient.rejectedBy && (
                    <>
                      <KV
                        label="Rejected By"
                        value={`${viewClient.rejectedBy} (${viewClient.rejectedAt
                          ?.toDate?.()
                          .toLocaleString()})`}
                        full
                      />
                      <KV
                        label="Rejection Reason"
                        value={viewClient.rejectionReason}
                        full
                      />
                    </>
                  )}
                </Section>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- UI HELPERS ---------- */

const Overlay = ({ children, onClose, large }) => (
  <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
    <div
      className={`bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto ${
        large ? "max-w-3xl w-full" : "max-w-md w-full"
      }`}
    >
      <button onClick={onClose} className="float-right text-gray-400 text-xl">
        ×
      </button>
      {children}
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <div>
    {" "}
    <h4 className="text-purple-900 font-bold mb-3 border-b pb-1">
      {title}
    </h4>{" "}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>{" "}
  </div>
);
const KV = ({ label, value, full, openInMap }) => (
  <div className={full ? "md:col-span-2" : ""}>
    {" "}
    <p className="text-xs text-gray-500">{label}</p>{" "}
    <p className="font-medium text-gray-900">{value || "-"}</p>{" "}
  </div>
);

const EmptyState = ({ title, description }) => (
  <div className="py-16 flex flex-col items-center justify-center text-center">
    <div className="text-purple-200 text-6xl mb-4">✓</div>
    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
    <p className="text-sm text-gray-500 mt-1">{description}</p>
  </div>
);

export default ClientApprovals;
