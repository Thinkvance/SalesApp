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
  updateDoc,
  serverTimestamp,
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
  const [awbSearchTerm, setAwbSearchTerm] = useState("");
  const [consignorPhoneSearchTerm, setConsignorPhoneSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPickup, setSelectedPickup] = useState(null);

  // -------- Escalation helpers --------
  const ORIGIN = typeof window !== "undefined" ? window.location.origin : "";
  // Adjust these routes to match your app’s paths
  const ESCALATION_ADD_URL = (awb, escalationId) =>
    `${ORIGIN}/EscalationSystem?mode=add&awb=${encodeURIComponent(awb)}${
      escalationId ? `&escalationId=${encodeURIComponent(escalationId)}` : ""
    }`;

  const ESCALATION_VIEW_URL = (awb, escalationId) =>
    `${ORIGIN}/EscalationSystem?mode=view&awb=${encodeURIComponent(awb)}${
      escalationId ? `&escalationId=${encodeURIComponent(escalationId)}` : ""
    }`;

  const ESCALATION_CLOSE_URL = (awb, escalationId) =>
    `${ORIGIN}/EscalationSystem?mode=close&awb=${encodeURIComponent(awb)}${
      escalationId ? `&escalationId=${encodeURIComponent(escalationId)}` : ""
    }`;

  const openInNewTab = (url) => {
    // keep noopener/noreferrer if you want; closing still works in modern browsers
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleAddReport = (item) => {
    openInNewTab(
      `/ReportForm?mode=add&awb=${encodeURIComponent(item.awbNumber)}`
    );
  };

  const handleViewReport = (item) => {
    openInNewTab(ESCALATION_VIEW_URL(item.awbNumber, item.escalationId));
  };

  const handleCloseEscalation = async (item) => {
    if (role !== "Manager") return; // UI guard; enforce with Firestore rules as well.
    try {
      const ref = doc(db, DB.db_collection, item.id);
      await updateDoc(ref, {
        escalationStatus: "closed",
        escalationClosedAt: serverTimestamp(),
        escalationClosedBy: username || "",
      });
      // Open closure report form in a NEW TAB after marking closed
      openInNewTab(ESCALATION_CLOSE_URL(item.awbNumber, item.escalationId));
    } catch (err) {
      console.error("Failed to close escalation:", err);
      alert("Failed to close escalation. Please try again.");
    }
  };
  // -------- End Escalation helpers --------

  async function Sharetrackinglink({
    name,
    awb,
    mode,
    destination,
    phone,
    currentStatus,
    packageConnectedDataTime,
  }) {
    setLoading(true);

    try {
      if (selectedRecipient[awb] === "consignee") {
        // no-op here as per your earlier constraint; keep the guard if needed
      }

      const estimatedDelivery = utilityFunctions.getEstimatedDate(
        packageConnectedDataTime,
        mode
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
                    parameter: String(awb),
                  },
                ],
              },
              templateName: "shareshipmentstatus",
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
        }
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

  useEffect(() => {
    if (!role) return;
    let q;
    if (role === "Manager" || role === "sales admin") {
      q = query(
        collection(db, DB.db_collection),
        orderBy("pickupDatetime", "desc")
      );
    } else {
      q = query(
        collection(db, DB.db_collection),
        where("pickupBookedBy", "==", username),
        orderBy("pickupDatetime", "desc"),
        where("pickupDatetime", ">=", Timestamp.fromDate(oneMonthAgo))
      );
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const pickupData = [];
      querySnapshot.forEach((docSnap) => {
        pickupData.push({ id: docSnap.id, ...docSnap.data() });
      });
      setdata(pickupData);
    });

    return () => unsubscribe();
  }, [role, username]);

  const filteredPickups = data.filter((pickup) => {
    const awbMatch = String(pickup.awbNumber)
      .toLowerCase()
      .includes(awbSearchTerm.toLowerCase());
    const consignorPhoneMatch = (pickup.consignorphonenumber || "")
      .toLowerCase()
      .includes(consignorPhoneSearchTerm.toLowerCase());
    return awbMatch && consignorPhoneMatch;
  });

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

  return (
    <>
      <Nav />
      <div className="container mx-auto p-6">
        <h2 className="text-3xl font-bold text-purple-700 mb-6">
          My Shipments
        </h2>
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
            <thead className="bg-purple-700 text-white text-left">
              <tr>
                {[
                  "AWB",
                  "Consignor Name",
                  "Consignor No.",
                  "Consignee No.",
                  "Vendor",
                  "Status",
                  "Send To",
                  "Share",
                  "Current Status",
                  "Last Update",
                  "Track",
                  "Details",
                  "Escalation",
                ].map((header) => (
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
              {filteredPickups.length > 0
                ? filteredPickups.map((item, i) => {
                    const escStatus = (
                      item.escalationStatus || "none"
                    ).toLowerCase(); // "none" | "pending" | "closed"
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
                        <td className="px-4 border py-2">{item.vendorName}</td>
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
                                    err
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
                            item.lastStatusUpdated
                          )}
                        </td>

                        <td className="px-4 py-2  border text-center">
                          <a
                            href={`https://shiphittracking.web.app/TrackingDetails/${item.awbNumber}`}
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
                            <button
                              onClick={() => handleAddReport(item)}
                              className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors duration-200"
                              title="Add escalation report"
                            >
                              Escalate
                            </button>
                          ) : escStatus === "pending" ? (
                            <div className="flex items-center justify-center gap-2">
                              <Pill type="pending">Pending</Pill>
                              {role === "Manager" && (
                                <button
                                  onClick={() => handleCloseEscalation(item)}
                                  className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors duration-200"
                                  title="Close escalation (Manager only)"
                                >
                                  Close
                                </button>
                              )}
                            </div>
                          ) : (
                            <Pill type="closed">Closed</Pill>
                          )}
                        </td>
                        {/* -------- End Escalation Column -------- */}
                      </tr>
                    );
                  })
                : null}
            </tbody>
          </table>

          {filteredPickups.length <= 0 ? (
            <div className="flex p-10 w-full  justify-center items-center">
              <span className="font-[12px] text-gray-400">No data</span>
            </div>
          ) : null}
        </div>

        {isModalOpen && selectedPickup && (
          <ShipmentDetails
            selectedPickup={selectedPickup}
            closeModal={closeModal}
          />
        )}
      </div>
    </>
  );
}
