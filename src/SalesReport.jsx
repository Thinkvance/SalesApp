import { useEffect, useState } from "react";
import Nav from "./Nav";
import {
  collection,
  query,
  onSnapshot,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";
import collectionName_BaseAwb from "./functions/collectionName";
import utilityFunctions from "./Utility/utilityFunctions";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import customParseFormat from "dayjs/plugin/customParseFormat";
import BarChartCom from "./salesReportCharts/BarChartCom";

dayjs.extend(customParseFormat);
dayjs.extend(isBetween);

function SalesReport() {
  const [username, setUsername] = useState(null);
  const [role, setRole] = useState("");
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [ImageUrl, setImageUrl] = useState("");
  const [awbSearchTerm, setAwbSearchTerm] = useState("");
  const [consignorPhoneSearchTerm, setConsignorPhoneSearchTerm] = useState("");
  const [pickupPersonName, setPickupPersonName] = useState("");
  const [location, setLocation] = useState("ALL");

  const [filterOption, setFilterOption] = useState("this_month");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });

  const [selectedBookedBy, setSelectedBookedBy] = useState("All");

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("LoginCredentials"));
    setUsername(storedUser?.name || "");
    setRole(storedUser?.role || "");
  }, []);

  const handleBlur = async (pickupId, awbNumber, newVendorPayment) => {
    if (newVendorPayment > 0) {
      try {
        const q = query(
          collection(db, "pickup"),
          where("awbNumber", "==", awbNumber)
        );
        const querySnapshot = await getDocs(q);
        const updates = [];

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const docRef = doc(db, "pickup", docSnap.id);

          if (data.vendorpayment !== newVendorPayment) {
            const logisticCost = parseFloat(data.logisticCost) || 0;
            const margin = Math.round(logisticCost - newVendorPayment);

            updates.push(
              updateDoc(docRef, {
                vendorpayment: newVendorPayment,
                margin: margin,
              })
            );

            setPickups((prevPickups) =>
              prevPickups.map((pickup) =>
                pickup.id === pickupId
                  ? {
                      ...pickup,
                      vendorpayment: newVendorPayment,
                      margin: margin,
                    }
                  : pickup
              )
            );
          }
        });

        await Promise.all(updates);
      } catch (error) {
        utilityFunctions.ErrorNotify("Error updating Firestore");
      }
    }
  };

  const parseDate = (datetime) => {
    if (!datetime) return 0;

    const parts = datetime.trim().split(" ");
    if (parts.length < 3) return 0;

    const [datePart, timePart, period] = parts;
    const [day, month, year] = datePart.split("-").map(Number);
    let [hour, minute, second] = timePart.split(":").map(Number);

    if (isNaN(day) || isNaN(hour)) return 0;

    // Convert to 24-hour time
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;

    return new Date(year, month - 1, day, hour, minute, second).getTime();
  };
  const fetchPickups = () => {
    setLoading(true);
    try {
      const collectionNames =
        location === "ALL"
          ? ["pickup", "franchise_pondy", "franchise_coimbatore"]
          : [
              collectionName_BaseAwb.getCollection(
                location === "HQ CHENNAI" ? "CHENNAI" : location
              ),
            ];

      const unsubscribes = [];
      where("status", "in", ["SHIPMENT CONNECTED", "PAYMENT DONE"]);

      Promise.all(
        collectionNames.map((name) => {
          const q = query(
            collection(db, name),
            where("status", "in", ["SHIPMENT CONNECTED", "PAYMENT DONE"])
          );
          return new Promise((resolve) => {
            const unsubscribe = onSnapshot(q, (snapshot) => {
              const data = snapshot.docs.map((doc) => ({
                ...doc.data(),
                id: doc.id,
              }));
              resolve(data);
            });
            unsubscribes.push(unsubscribe);
          });
        })
      )
        .then((results) => {
          const combinedData = results.flat();
          setPickups(combinedData);
          setLoading(false);
        })
        .catch(() => {
          utilityFunctions.ErrorNotify("Unable to retrieve data.");
          setLoading(false);
        });

      return () => unsubscribes.forEach((u) => u());
    } catch {
      utilityFunctions.ErrorNotify("Error fetching pickups.");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (username) fetchPickups();
  }, [username, location]);

  const getFilterRange = () => {
    const today = dayjs();
    switch (filterOption) {
      case "this_week":
        return {
          from: today.startOf("week"),
          to: today.endOf("week"),
        };
      case "last_week":
        return {
          from: today.subtract(1, "week").startOf("week"),
          to: today.subtract(1, "week").endOf("week"),
        };
      case "last_month":
        return {
          from: today.subtract(1, "month").startOf("month"),
          to: today.subtract(1, "month").endOf("month"),
        };
      case "select_range":
        return {
          from: dayjs(customRange.from),
          to: dayjs(customRange.to),
        };
      case "this_month":
      default:
        return {
          from: today.startOf("month"),
          to: today.endOf("month"),
        };
    }
  };
  const { from, to } = getFilterRange();
  const filteredPickups = pickups.filter((pickup) => {
    const dateStr = pickup.PaymentComfirmedDate;
    if (!dateStr) return false;

    const dayjsDate = dayjs(dateStr, "DD-MM-YYYY h:mm:ss A");
    if (!dayjsDate.isValid()) {
      // console.warn("Invalid date format:", pickup.awbNumber);
      return false;
    }

    const withinDateRange = dayjsDate.isBetween(from, to, "day", "[]");
    const matchesAwb = String(pickup.awbNumber || "")
      .toLowerCase()
      .includes(awbSearchTerm.toLowerCase());
    const matchesPhone = (pickup.consignorphonenumber || "")
      .toLowerCase()
      .includes(consignorPhoneSearchTerm.toLowerCase());
    const matchesPickupPerson = (pickup.pickUpPersonName || "")
      .toLowerCase()
      .includes(pickupPersonName.toLowerCase());
    const matchesBookedBy =
      selectedBookedBy === "All" ||
      pickup.pickupBookedBy?.toLowerCase() === selectedBookedBy.toLowerCase();

    return (
      withinDateRange &&
      matchesAwb &&
      matchesPhone &&
      matchesPickupPerson &&
      matchesBookedBy
    );
  });

  const totalSales = filteredPickups.length;

  const totalLogisticsCost = filteredPickups.reduce(
    (sum, pickup) => sum + (pickup.logisticCost || 0),
    0
  );

  const totalMargin = filteredPickups.reduce(
    (sum, pickup) => sum + (pickup.margin || 0),
    0
  );

  const salesData = Object.values(
    filteredPickups.reduce((acc, curr) => {
      const name = curr.pickupBookedBy;
      const margin = parseFloat(curr.margin);
      const safeMargin = isNaN(margin) ? 0 : margin;

      if (!acc[name]) {
        acc[name] = { name, totalMargin: 0, color: "#9333ea" };
      }
      acc[name].totalMargin += safeMargin;
      return acc;
    }, {})
  );

  return (
    <>
      <Nav />
      <div className="container mx-auto p-6 rounded-lg">
        <h1 className="text-3xl font-bold mb-6 text-purple-700">
          Sales Report
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 items-end">
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter By
            </label>
            <select
              className="input-style w-full"
              value={filterOption}
              onChange={(e) => setFilterOption(e.target.value)}
            >
              <option value="this_month">This Month</option>
              <option value="this_week">This Week</option>
              <option value="last_week">Last Week</option>
              <option value="last_month">Last Month</option>
              <option value="select_range">Select Range</option>
            </select>
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sales Representative
            </label>
            {/* Booked By Dropdown */}
            <select
              value={selectedBookedBy}
              onChange={(e) => setSelectedBookedBy(e.target.value)}
              className="border rounded  input-style w-full"
            >
              <option value="All"> Select Sales Representative</option>
              <option value="mouli">mouli</option>
              <option value="sana">sana</option>
              <option value="Tamil Selvi">Tamil Selvi</option>
              <option value="jaga">jaga</option>
            </select>
          </div>
          {filterOption === "select_range" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From
                </label>
                <input
                  type="date"
                  className="input-style w-full"
                  value={customRange.from}
                  onChange={(e) =>
                    setCustomRange((prev) => ({
                      ...prev,
                      from: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To
                </label>
                <input
                  type="date"
                  className="input-style w-full"
                  value={customRange.to}
                  onChange={(e) =>
                    setCustomRange((prev) => ({ ...prev, to: e.target.value }))
                  }
                />
              </div>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-4 mb-6 justify-start items-center">
          {/* Total Sales */}
          <div className="flex-1 min-w-[220px] max-w-sm bg-purple-100 border border-purple-300 rounded-xl p-6 shadow-md h-fit">
            <h2 className="text-lg font-semibold text-purple-700 mb-2">
              Total Sales
            </h2>
            <p className="text-2xl font-bold text-purple-900">{totalSales}</p>
          </div>

          {/* Total Logistic Cost */}
          <div className="flex-1 min-w-[220px] max-w-sm bg-green-100 border border-green-300 rounded-xl p-6 shadow-md h-fit">
            <h2 className="text-lg font-semibold text-green-700 mb-2">
              Total Logistic Cost
            </h2>
            <p className="text-2xl font-bold text-green-900">
              {totalLogisticsCost}
            </p>
          </div>

          {/* Total Margin */}
          <div className="flex-1 min-w-[220px] max-w-sm bg-yellow-100 border border-yellow-300 rounded-xl p-6 shadow-md h-fit">
            <h2 className="text-lg font-semibold text-yellow-700 mb-2">
              Total Margin
            </h2>
            <p className="text-2xl font-bold text-yellow-900">
              ₹ {totalMargin}
            </p>
          </div>

          {/* Bar Chart Section (Visually wider) */}
          <div className="flex-[2] min-w-full sm:min-w-[500px] bg-white border border-gray-200 rounded-xl p-4 shadow-md">
            <div className="mb-3">
              <BarChartCom salesData={salesData} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-gray-700 mb-1">
                Total Margin Overview
              </h2>
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                ₹ {totalMargin}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-auto border scrollbar-hide">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow overflow-hidden">
            <thead className="bg-purple-600 text-white sticky top-0">
              <tr>
                {[
                  "AWB Number",
                  "Consignor Name",
                  "Phone",
                  "Destination",
                  "Weight",
                  "Vendor",
                  "Pickup Area",
                  "Pickup Status",
                  "Payment Confirmed At",
                  "Booked By",
                  "Pickup Person",
                  "Status",
                  "Sales Close",
                  "Vendor Payment",
                  "Margin",
                  "Payment Proof",
                ].map((head, i) => (
                  <th key={i} className="py-3 px-4 border">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPickups.length > 0 ? (
                [...filteredPickups]
                  .sort(
                    (a, b) =>
                      parseDate(b.PaymentComfirmedDate) -
                      parseDate(a.PaymentComfirmedDate)
                  )
                  .map((pickup, idx) => (
                    <tr
                      key={pickup.id}
                      className={idx % 2 === 0 ? "bg-gray-50" : ""}
                    >
                      <td className="py-3 px-4 border">{pickup.awbNumber}</td>
                      <td className="py-3 px-4 border">
                        {pickup.consignorname}
                      </td>
                      <td className="py-3 px-4 border">
                        {pickup.consignorphonenumber}
                      </td>
                      <td className="py-3 px-4 border">{pickup.destination}</td>
                      <td className="py-3 px-4 border">{pickup.weightapx}</td>
                      <td className="py-3 px-4 border">{pickup.vendorName}</td>
                      <td className="py-3 px-4 border">{pickup.pickuparea}</td>
                      <td className="py-3 px-4 border">
                        {pickup.pickUpPersonNameStatus || "NOT COMPLETED"}
                      </td>
                      <td className="py-3 px-4 border text-nowrap">
                        {pickup.PaymentComfirmedDate}
                      </td>
                      <td className="py-3 px-4 border">
                        {pickup.pickupBookedBy}
                      </td>
                      <td className="py-3 px-4 border">
                        {pickup.pickUpPersonName}
                      </td>
                      <td className="py-3 px-4 border text-center">
                        {pickup.status}
                      </td>
                      <td className="py-3 px-4 border">
                        {pickup.logisticCost || "--"}
                      </td>
                      <td className="border w-[120px] h-full relative">
                        <textarea
                          readOnly={!pickup.logisticCost}
                          value={pickup.vendorpayment || ""}
                          placeholder="₹"
                          title="Enter vendor payment"
                          onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*$/.test(value)) {
                              setPickups((prev) =>
                                prev.map((p) =>
                                  p.id === pickup.id
                                    ? { ...p, vendorpayment: value }
                                    : p
                                )
                              );
                            }
                          }}
                          onBlur={() =>
                            handleBlur(
                              pickup.id,
                              pickup.awbNumber,
                              parseInt(pickup.vendorpayment || "0")
                            )
                          }
                          className="w-full h-full text-center resize-none bg-transparent p-2 focus:ring-1 focus:ring-purple-500 rounded-md"
                        />
                      </td>
                      <td className="py-3 px-4 border">
                        {pickup.margin || "--"}
                      </td>
                      <td className="py-3 px-4 border">
                        {pickup.paymentProof ? (
                          <img
                            onClick={() => {
                              setShowModal(true);
                              setImageUrl(pickup.paymentProof);
                            }}
                            src="Vector.svg"
                            className="cursor-pointer w-5 ml-auto mr-auto"
                            alt=""
                          />
                        ) : (
                          <p className="w-5 ml-auto mr-auto">--</p>
                        )}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan="15" className="text-center py-4 text-gray-600">
                    No pickups found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 transition-opacity duration-300">
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full animate-fade-in">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"
              onClick={() => setShowModal(false)}
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <h2 className="text-2xl font-semibold text-center text-purple-700 mb-4">
              Payment Proof
            </h2>

            <div className="flex justify-center">
              <img
                src={ImageUrl}
                alt="Payment Proof"
                className="rounded-xl max-h-[400px] object-contain border border-gray-200 shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SalesReport;
