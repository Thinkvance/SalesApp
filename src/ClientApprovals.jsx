import React, { useEffect, useState } from "react";
import {
  collection,
  doc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { FaEye, FaCheck, FaXmark } from "react-icons/fa6";
import Nav from "./Nav";
import DB from "./DB/DB";
import { useForm } from "react-hook-form";
import { CiCircleMore } from "react-icons/ci";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";

function ClientApprovals() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [trackedCompanies, setTrackedCompanies] = useState([]);

  // Detail modal
  const [viewClient, setViewClient] = useState(null);

  // Approval modal
  const [selectedClient, setSelectedClient] = useState(null);
  const [actionType, setActionType] = useState(null); // APPROVE | REJECT
  const [note, setNote] = useState("");
  const user = JSON.parse(localStorage.getItem("LoginCredentials"));
  const [editClient, setEditClient] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  // 📊 Step 1: fetch company names from ClientOnboarding, then aggregate pickup data
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        // Get all company names from ClientOnboarding
        const clientSnap = await getDocs(collection(db, DB.ClientOnboarding));
        const companies = [];
        clientSnap.forEach((d) => {
          const name = d.data().companyName;
          if (name) companies.push(name);
        });
        if (companies.length === 0) return;
        setTrackedCompanies(companies);

        // Firestore "in" supports max 30 items — chunk if needed
        const chunks = [];
        for (let i = 0; i < companies.length; i += 30)
          chunks.push(companies.slice(i, i + 30));

        const allDocs = [];
        await Promise.all(
          chunks.map(async (chunk) => {
            const snap = await getDocs(
              query(
                collection(db, DB.db_collection),
                where("companyName", "in", chunk),
              ),
            );
            snap.forEach((d) => allDocs.push(d.data()));
          }),
        );

        // Aggregate per company
        const agg = {};
        companies.forEach((c) => {
          agg[c] = { name: c, shipments: 0, totalCost: 0, totalWeight: 0 };
        });
        allDocs.forEach(({ companyName, logisticCost, actualWeight }) => {
          if (agg[companyName]) {
            agg[companyName].shipments += 1;
            agg[companyName].totalCost += Number(logisticCost) || 0;
            agg[companyName].totalWeight += parseFloat(actualWeight) || 0;
          }
        });
        setChartData(Object.values(agg));
      } catch (e) {
        console.error("Chart data fetch error:", e);
      }
    };
    fetchChartData();
  }, []);


  // 🔥 Realtime Firestore listener
  useEffect(() => {
    const q = query(
      collection(db, DB.ClientOnboarding),
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

    await updateDoc(doc(db, DB.ClientOnboarding, selectedClient.id), {
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

          {/* -------- Overview Section -------- */}
          {chartData.length > 0 && (() => {
            const totals = chartData.reduce(
              (acc, c) => ({ shipments: acc.shipments + c.shipments, totalCost: acc.totalCost + c.totalCost, totalWeight: acc.totalWeight + c.totalWeight }),
              { shipments: 0, totalCost: 0, totalWeight: 0 },
            );
            return (
              <div className="border-b px-6 py-5">
                <h3 className="text-sm font-semibold text-purple-800 mb-4">Shipment Overview by Company</h3>
                <div className="flex flex-col md:flex-row gap-4">
                  {/* 30% stat cards */}
                  <div className="flex flex-row md:flex-col gap-2 md:w-[30%] w-full">
                    <div className="flex-1 rounded-lg bg-purple-50 border border-purple-100 px-3 py-2.5 flex items-center gap-3">
                      <div className="w-1 self-stretch rounded-full bg-purple-400" />
                      <div>
                        <p className="text-[11px] text-purple-500 font-semibold uppercase tracking-wide">Shipments</p>
                        <p className="text-lg font-bold text-purple-800 leading-tight">{totals.shipments}</p>
                        <p className="text-[10px] text-purple-400">across all clients</p>
                      </div>
                    </div>
                    <div className="flex-1 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2.5 flex items-center gap-3">
                      <div className="w-1 self-stretch rounded-full bg-emerald-400" />
                      <div>
                        <p className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wide">Total Cost</p>
                        <p className="text-lg font-bold text-emerald-700 leading-tight">₹{totals.totalCost.toLocaleString()}</p>
                        <p className="text-[10px] text-emerald-400">logistic cost</p>
                      </div>
                    </div>
                    <div className="flex-1 rounded-lg bg-sky-50 border border-sky-100 px-3 py-2.5 flex items-center gap-3">
                      <div className="w-1 self-stretch rounded-full bg-sky-400" />
                      <div>
                        <p className="text-[11px] text-sky-500 font-semibold uppercase tracking-wide">Total Weight</p>
                        <p className="text-lg font-bold text-sky-700 leading-tight">{totals.totalWeight.toFixed(2)} kg</p>
                        <p className="text-[10px] text-sky-400">actual weight</p>
                      </div>
                    </div>
                  </div>
                  {/* 70% bar chart */}
                  <div className="md:w-[70%] w-full">
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={chartData} margin={{ top: 28, right: 60, left: 10, bottom: 70 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ede9fe" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b21a8" }} angle={-35} textAnchor="end" interval={0} />
                        <YAxis yAxisId="left" orientation="left" allowDecimals={false} tick={{ fontSize: 11, fill: "#7c3aed" }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#059669" }} tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`} />
                        <Tooltip formatter={(value, name) => {
                          if (name === "Total Cost (₹)") return [`₹${Number(value).toLocaleString()}`, name];
                          if (name === "Total Weight (kg)") return [`${Number(value).toFixed(2)} kg`, name];
                          return [value, name];
                        }} />
                        <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
                        <Bar yAxisId="left" dataKey="shipments" name="Shipments" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={16}>
                          <LabelList dataKey="shipments" position="top" style={{ fontSize: 10, fill: "#7c3aed", fontWeight: 700 }} formatter={(v) => v > 0 ? v : ""} />
                        </Bar>
                        <Bar yAxisId="right" dataKey="totalCost" name="Total Cost (₹)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16}>
                          <LabelList dataKey="totalCost" position="top" style={{ fontSize: 10, fill: "#059669", fontWeight: 700 }} formatter={(v) => v > 0 ? `₹${(v / 1000).toFixed(1)}k` : ""} />
                        </Bar>
                        <Bar yAxisId="left" dataKey="totalWeight" name="Total Weight (kg)" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={16}>
                          <LabelList dataKey="totalWeight" position="top" style={{ fontSize: 10, fill: "#0ea5e9", fontWeight: 700 }} formatter={(v) => v > 0 ? `${Number(v).toFixed(1)}` : ""} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            );
          })()}
          {/* -------- End Overview Section -------- */}

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
                    <th className="px-6 py-3 text-left">Actions</th>
                    <th className="px-6 py-3 text-left">Edit Profile</th>
                    <th className="px-6 py-3 text-left">View More</th>
                  </tr>
                </thead>

                <tbody>
                  {clients.map((client) => (
                    <tr
                      key={client.id}
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
                        <div className="flex items-center gap-3">
                          {client.status === "PENDING" ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedClient(client);
                                  setActionType("APPROVE");
                                }}
                                className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition"
                              >
                                <FaCheck />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedClient(client);
                                  setActionType("REJECT");
                                }}
                                className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition"
                              >
                                <FaXmark />
                              </button>
                            </>
                          ) : client.status === "APPROVED" ? (
                            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                              APPROVED
                            </span>
                          ) : (
                            <span className="px-3 py-1 text-xs font- rounded-full bg-red-100 text-red-700">
                              REJECTED
                            </span>
                          )}
                        </div>
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

                      <td
                        className="px-6 py-4"
                        onClick={() => setViewClient(client)}
                      >
                        <CiCircleMore size={26} color="green" />
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
                  onInput={(e) =>
                    (e.target.value = e.target.value.toUpperCase())
                  }
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
                  <KV label="Company Name" value={viewClient.companyName} />
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
