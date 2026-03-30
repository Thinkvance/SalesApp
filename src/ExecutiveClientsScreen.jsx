import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  updateDoc,
  query,
  orderBy,
  doc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import Nav from "./Nav";
import DB from "./DB/DB";
import { useForm } from "react-hook-form";
import { serverTimestamp } from "firebase/firestore";
function ExecutiveClientsScreen() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [User, setUser] = useState(null);
  const [viewClient, setViewClient] = useState(null);
  const [editClient, setEditClient] = useState(null);
  const user = JSON.parse(localStorage.getItem("LoginCredentials"));

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const onSubmit = async (data) => {
    await updateDoc(doc(db, DB.ClientOnboarding, editClient.id), {
      billingCompanyName: data.billingCompanyName,
      GSTNumber: data.GSTNumber,
      GSTState: data.GSTState,
      billingAddress: data.billingAddress,

      needGST: true,

      lastUpdatedAt: serverTimestamp(),
      lastUpdatedBy: user.email,
    });

    setEditClient(null);
  };

  useEffect(() => {
    if (editClient) {
      reset({
        billingCompanyName: editClient.billingCompanyName || "",
        GSTNumber: editClient.GSTNumber || "",
        GSTState: editClient.GSTState || "",
        billingAddress: editClient.billingAddress || "",
      });
    }
  }, [editClient, reset]);

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
      collection(db, DB.ClientOnboarding),
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

      <div className="p-4 sm:p-6 bg-gray-100 min-h-screen">
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
                    <th className="px-6 py-3 text-left">Edit Profile</th>
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

                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditClient(client);
                          }}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 active:scale-95
    ${
      client.needGST
        ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
        : "bg-orange-100 text-orange-700 hover:bg-orange-200"
    }
  `}
                        >
                          {client.needGST ? "Edit GST" : "Add GST"}
                        </button>
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

      {editClient && (
        <Overlay onClose={() => setEditClient(null)}>
          <h3 className="text-lg font-bold text-purple-900 mb-4">
            {!editClient.needGST ? "Add GST Details" : "Edit GST Details"}
          </h3>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Billing Company */}
            <div>
              <label className="text-xs text-gray-500">
                Billing Company Name
              </label>
              <input
                placeholder="Enter billing company name"
                {...register("billingCompanyName", {
                  required: "Billing company name is required",
                  minLength: {
                    value: 3,
                    message: "Minimum 3 characters required",
                  },
                })}
                className={`w-full border rounded-lg p-2 text-sm mt-1 ${
                  errors.billingCompanyName ? "border-red-400" : ""
                }`}
              />
              {errors.billingCompanyName && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.billingCompanyName.message}
                </p>
              )}
            </div>

            {/* GST Number */}
            <div>
              <label className="text-xs text-gray-500">GST Number</label>
              <input
                placeholder="e.g. 33ABCDE1234F1Z5"
                {...register("GSTNumber", {
                  required: "GST number is required",
                  minLength: {
                    value: 15,
                    message: "GST must be 15 characters",
                  },
                  maxLength: {
                    value: 15,
                    message: "GST must be 15 characters",
                  },
                  pattern: {
                    value:
                      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
                    message: "Invalid GST format (e.g. 33ABCDE1234F1Z5)",
                  },
                })}
                onInput={(e) => (e.target.value = e.target.value.toUpperCase())}
                className={`w-full border rounded-lg p-2 text-sm mt-1 uppercase ${
                  errors.GSTNumber ? "border-red-400" : ""
                }`}
              />
              {errors.GSTNumber && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.GSTNumber.message}
                </p>
              )}
            </div>

            {/* GST State */}
            <div>
              <label className="text-xs text-gray-500">
                GST Registered State
              </label>
              <select
                {...register("GSTState", {
                  required: "GST registered state is required",
                })}
                className={`w-full border rounded-lg p-2 text-sm mt-1 ${
                  errors.GSTState ? "border-red-400" : ""
                }`}
                defaultValue=""
              >
                <option value="" disabled>
                  Select GST Registered State
                </option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Coimbatore">Coimbatore</option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Telangana">Telangana</option>
                <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                <option value="Assam">Assam</option>
                <option value="Bihar">Bihar</option>
                <option value="Chhattisgarh">Chhattisgarh</option>
                <option value="Goa">Goa</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Haryana">Haryana</option>
                <option value="Himachal Pradesh">Himachal Pradesh</option>
                <option value="Jharkhand">Jharkhand</option>
                <option value="Kerala">Kerala</option>
                <option value="Madhya Pradesh">Madhya Pradesh</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Manipur">Manipur</option>
                <option value="Meghalaya">Meghalaya</option>
                <option value="Mizoram">Mizoram</option>
                <option value="Nagaland">Nagaland</option>
                <option value="Odisha">Odisha</option>
                <option value="Punjab">Punjab</option>
                <option value="Rajasthan">Rajasthan</option>
                <option value="Sikkim">Sikkim</option>
                <option value="Tripura">Tripura</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Uttarakhand">Uttarakhand</option>
                <option value="West Bengal">West Bengal</option>
              </select>
              {errors.GSTState && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.GSTState.message}
                </p>
              )}
            </div>

            {/* Billing Address */}
            <div>
              <label className="text-xs text-gray-500">
                GST Address / Billing Address
              </label>
              <textarea
                placeholder="Enter complete billing address"
                {...register("billingAddress", {
                  required: "Billing address is required",
                  minLength: {
                    value: 10,
                    message: "Minimum 10 characters required",
                  },
                })}
                className={`w-full border rounded-lg p-2 text-sm mt-1 ${
                  errors.billingAddress ? "border-red-400" : ""
                }`}
              />
              {errors.billingAddress && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.billingAddress.message}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setEditClient(null)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-5 py-2 bg-purple-600 text-white rounded-lg"
              >
                {!editClient.needGST ? "Add GST" : "Update GST"}
              </button>
            </div>
          </form>
        </Overlay>
      )}
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

export default ExecutiveClientsScreen;
