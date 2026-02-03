import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import Nav from "./Nav";

function ExecutiveClientsScreen() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [User, setUser] = useState(null);
  const [viewClient, setViewClient] = useState(null);

  /* -------------------- LOAD USER -------------------- */
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("LoginCredentials"));
    if (!user) {
      setLoading(false);
      return;
    }
    setUser(user);
  }, []);

  /* -------------------- FIRESTORE LISTENER -------------------- */
  useEffect(() => {
    if (!User?.name || !User?.email) return;

    const q = query(
      collection(db, "ClientOnboarding"),
      where("CreatedBy", "==", User.name),
      where("CreatedByEmail", "==", User.email),
      orderBy("createdAt", "desc"),
    );

    const unsub = onSnapshot(q, (snap) => {
      setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, [User]);

  /* -------------------- MODAL SCROLL LOCK -------------------- */
  useEffect(() => {
    document.body.style.overflow = viewClient ? "hidden" : "auto";
    return () => (document.body.style.overflow = "auto");
  }, [viewClient]);

  /* -------------------- HELPERS -------------------- */
  const openInMap = (coordinates) => {
    if (!coordinates || typeof coordinates !== "string") return;

    const parts = coordinates.split(",");
    if (parts.length !== 2) return;

    const lat = parts[0].trim();
    const lng = parts[1].trim();

    if (!lat || !lng) return;
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  const formatName = (name = "") =>
    name
      .trim()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

  const formatDate = (ts) => {
    if (!ts) return "-";
    if (ts?.toDate) return ts.toDate().toLocaleDateString();
    return new Date(ts).toLocaleDateString();
  };

  const formatDateTime = (ts) => {
    if (!ts) return "-";
    if (ts?.toDate) return ts.toDate().toLocaleString();
    return new Date(ts).toLocaleString();
  };

  /* -------------------- LOADING -------------------- */
  if (loading) {
    return <p className="p-6 text-gray-500">Loading clients…</p>;
  }

  return (
    <div>
      <Nav />

      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl border shadow-sm">
          {/* Header */}
          <div className="px-6 py-4 border-b rounded-t-2xl bg-purple-50 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-purple-900">
                Client Overview
                {User?.name && (
                  <span className="ml-2 text-sm font-medium text-purple-700">
                    — Created by {formatName(User.name)}
                  </span>
                )}
              </h2>
              <p className="text-xs text-purple-700">
                Read-only client profiles
              </p>
            </div>

            <span className="text-sm text-purple-700">
              Total Clients: {clients.length}
            </span>
          </div>

          {/* Table */}
          {clients.length === 0 ? (
            <EmptyState
              title="No clients available"
              description="Client profiles will appear here once they are created."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-purple-50 text-purple-800 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left">Company</th>
                    {/* <th className="px-6 py-3 text-left">Created By</th> */}
                    <th className="px-6 py-3 text-left">City</th>
                    <th className="px-6 py-3 text-left">Onboarded On</th>
                    <th className="px-6 py-3 text-left">Current Status</th>
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

                      {/* <td className="px-6 py-4">
                        <div>{client.CreatedBy}</div>
                        <div className="text-xs text-gray-500">
                          {client.CreatedByEmail}
                        </div>
                      </td> */}

                      <td className="px-6 py-4">{client.city}</td>

                      <td className="px-6 py-4">
                        {formatDate(client.createdAt)}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* DETAILS MODAL */}
        {viewClient && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
            <div
              className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
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
                <Section title="Created By">
                  <KV label="Name" value={viewClient.CreatedBy} />
                  <KV label="Role" value={viewClient.CreatedByRole} />
                  <KV label="Email" value={viewClient.CreatedByEmail} />
                  <KV label="Location" value={viewClient.CreatedByLocation} />
                  <KV
                    label="Created At"
                    value={formatDateTime(viewClient.createdAt)}
                  />
                </Section>

                <Section title="Pickup Details">
                  <KV label="Consignor Name" value={viewClient.consignorName} />
                  <KV label="Phone" value={viewClient.consignorPhone} />
                  <KV label="Address" value={viewClient.consignorAddress} />
                  <KV label="City" value={viewClient.city} />
                  <KV label="Pincode" value={viewClient.pincode} />
                  <KV label="Pickup Area" value={viewClient.pickupArea} />
                  <KV
                    label="Coordinates"
                    value={
                      viewClient.coordinates && (
                        <button
                          onClick={() => openInMap(viewClient.coordinates)}
                          className="text-purple-600 underline"
                        >
                          View on map
                        </button>
                      )
                    }
                  />
                  <KV
                    label="Special Instructions"
                    value={viewClient.specialInstructions}
                    full
                  />
                </Section>

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

                <Section title="Business Details">
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

                <Section title="Documents">
                  <KV
                    label="KYC Document"
                    value={
                      viewClient.kycFileUrl ? (
                        <a
                          href={viewClient.kycFileUrl}
                          target="_blank"
                          className="text-purple-600 underline"
                        >
                          View
                        </a>
                      ) : (
                        "-"
                      )
                    }
                  />
                  <KV
                    label="Rate Card"
                    value={
                      viewClient.rateCardFileUrl ? (
                        <a
                          href={viewClient.rateCardFileUrl}
                          target="_blank"
                          className="text-purple-600 underline"
                        >
                          View
                        </a>
                      ) : (
                        "-"
                      )
                    }
                  />
                </Section>

                <Section title="Client Status">
                  <KV label="Current Status" value={viewClient.status} />

                  {viewClient.approvedBy && (
                    <KV
                      label="Reviewed By"
                      value={`${viewClient.approvedBy} (${formatDateTime(
                        viewClient.approvedAt,
                      )})`}
                      full
                    />
                  )}

                  {viewClient.rejectedBy && (
                    <>
                      <KV
                        label="Reviewed By"
                        value={`${viewClient.rejectedBy} (${formatDateTime(
                          viewClient.rejectedAt,
                        )})`}
                        full
                      />
                      <KV
                        label="Remarks"
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

/* -------------------- UI HELPERS -------------------- */

const Section = ({ title, children }) => (
  <div>
    <h4 className="text-purple-900 font-bold mb-3 border-b pb-1">{title}</h4>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  </div>
);

const KV = ({ label, value, full }) => (
  <div className={full ? "md:col-span-2" : ""}>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="font-medium text-gray-900">{value || "-"}</p>
  </div>
);

const EmptyState = ({ title, description }) => (
  <div className="py-16 flex flex-col items-center justify-center text-center">
    <div className="text-purple-200 text-6xl mb-4">✓</div>
    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
    <p className="text-sm text-gray-500 mt-1">{description}</p>
  </div>
);

export default ExecutiveClientsScreen;
