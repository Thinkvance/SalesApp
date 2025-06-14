import { useEffect, useState } from "react";
import positive_lottie from "./assets/positive_lottie.json"; // Replace with your animation JSON path
import negative_lottie from "./assets/negative_lottie.json"; // Replace with your animation JSON path
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
import SalesReportBarChartCity from "./Charts/SalesReportBarChartCity";
import DB from "./DB/DB";
import ShipmentDetails from "./ShipmentDetails";
import SalesReportBarChart from "./Charts/SalesReportBarChart";
import Lottie from "lottie-react";

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
  const [GrowthPercentage, setGrowthPercentage] = useState("");
  const [filterOption, setFilterOption] = useState("this_month");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [selectedChart, setselectedChart] = useState("Chart For SE");
  const [selectedBookedBy, setSelectedBookedBy] = useState("All");
  const [SelectedCity, setSelectedCity] = useState("All");
  const [selectedSource, setselectedSource] = useState("All");

  const [isModalOpen, setIsModalOpen] = useState(false); // State to control modal visibility
  const [selectedPickup, setSelectedPickup] = useState(null); // State to hold the selected pickup for modal

  const [pickupPersons, setPickupPersons] = useState([""]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "LoginCredentials"),
      (querySnapshot) => {
        const names = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          Object.values(data).forEach((arr) => {
            if (["sales admin", "sales associate"].includes(arr[2]))
              names.push(arr[0]); // Push only the name (index 0)
          });
        });
        setPickupPersons(names);
      },
      (error) => {
        console.error("Error fetching pickup persons: ", error);
      }
    );

    return () => unsubscribe();
  }, []);

  console.log("pickupPersons", pickupPersons);

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPickup(null); // Reset selected pickup when modal is closed
  };

  const handleMoreIconClick = (pickup) => {
    setSelectedPickup(pickup);
    setIsModalOpen(true); // Open the modal
  };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("LoginCredentials"));
    setUsername(storedUser?.name || "");
    setRole(storedUser?.role || "");
  }, []);

  const handleBlur = async (pickupId, awbNumber, newVendorPayment) => {
    if (newVendorPayment > 0) {
      try {
        const q = query(
          collection(db, DB.db_collection),
          where("awbNumber", "==", awbNumber)
        );
        const querySnapshot = await getDocs(q);
        const updates = [];

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const docRef = doc(db, DB.db_collection, docSnap.id);

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
          ? [DB.db_collection, "franchise_pondy", "franchise_coimbatore"]
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
    const matchedCity =
      SelectedCity === "All" ||
      pickup.City?.toLowerCase() === SelectedCity.toLowerCase();
    const matchedsource =
      selectedSource === "All" ||
      pickup.Source?.toLowerCase() === selectedSource.toLowerCase();

    return (
      withinDateRange &&
      matchesAwb &&
      matchesPhone &&
      matchesPickupPerson &&
      matchesBookedBy &&
      matchedCity &&
      matchedsource
    );
  });

  const totalSales = filteredPickups.length;

  const totalLogisticsCost = filteredPickups.reduce(
    (sum, pickup) => sum + (pickup.logisticCost || 0),
    0
  );

  const totalDiscount = filteredPickups.reduce(
    (sum, pickup) => sum + (pickup.discountCost || 0),
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

  useEffect(() => {
    async function getData() {
      try {
        const [growthPercentage] = await Promise.all([
          utilityFunctions.growth(),
        ]);
        setGrowthPercentage(growthPercentage);
      } catch (error) {
        utilityFunctions.ErrorNotify("Data fetch failed. Please try again.");
      }
    }
    getData();
  }, []); // Trigger fetch when startendrange updates

  return (
    <>
      <Nav />
      <div className="container mx-auto p-6 rounded-lg">
        <h1 className="text-3xl font-bold mb-6 text-purple-700">
          Sales Report
        </h1>
        <div className="flex flex-row  flex-wrap gap-6 mb-6 items-end">
          <div className="w-fit col-span-1 md:col-span-2">
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
          <div className=" w-fit col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sales Representative
            </label>
            <select
              value={selectedBookedBy}
              onChange={(e) => setSelectedBookedBy(e.target.value)}
              className="border rounded  input-style w-full"
            >
              <option value="All"> Select Sales Representative</option>
              {pickupPersons.map((d) => (
                <option value={d}>{d}</option>
              ))}
            </select>
          </div>
          {/* <div className="w-fit col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Area
            </label>
            <select
              value={SelectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="border rounded  input-style w-full"
            >
              <option value="All">All</option>
              <option value="CHENNAI">Chennai</option>
              <option value="PONDY">Pondy</option>
              <option value="COIMBATORE">Coimbatore</option>
            </select>
          </div> */}
          <div className="w-fit col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source
            </label>
            <select
              value={selectedSource}
              onChange={(e) => setselectedSource(e.target.value)}
              className="border rounded  input-style w-full"
            >
              <option value="All">All</option>
              <option value="FB Ad">FB Ad</option>
              <option value="Google Ad">Google Ad</option>
              <option value="Website Ad">Website Ad</option>
              <option value="Direct Ad">Direct Ad</option>
              <option value="Whatsapp Campaign">Whatsapp Campaign</option>
              <option value="Repeated Customer">Repeated Customer</option>
              <option value="Customer Refer">Customer Refer</option>
              <option value="Employee Refer">Employee Refer</option>
              <option value="Offline Ad">Offline Ad</option>
              <option value="GMB">GMB</option>
            </select>
          </div>
          <div className="w-fit col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Change By Chart
            </label>
            <select
              value={selectedChart}
              onChange={(e) => setselectedChart(e.target.value)}
              className="border rounded  input-style w-full"
            >
              <option value="Chart For SE">Chart For SE</option>
              <option value="Chart For City">Chart for City</option>
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
        <div className="flex flex-col gap-6 mb-6 sm:flex-row sm:flex-wrap sm:gap-10 sm:items-start">
          {/* Card Grid Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full sm:max-w-[500px]">
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 shadow-md">
              <h2 className="text-lg font-semibold text-purple-800 mb-2">
                Total Sales
              </h2>
              <p className="text-2xl font-bold text-purple-900">{totalSales}</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-6 shadow-md">
              <h2 className="text-lg font-semibold text-green-800 mb-2">
                Total Logistic Cost
              </h2>
              <p className="text-2xl font-bold text-green-900">
                {totalLogisticsCost}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-md">
              <h2 className="text-lg font-semibold text-blue-800 mb-2">
                Discounts Applied
              </h2>
              <p className="text-2xl font-bold text-blue-900">
                {totalDiscount}
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 shadow-md min-w-[200px] max-w-sm">
              <h2 className="text-lg font-semibold text-yellow-800 mb-2">
                Growth
              </h2>
              <p className="text-2xl font-bold text-yellow-900 flex items-center gap-2">
                {`${GrowthPercentage}%`}
                {GrowthPercentage > 0 ? (
                  <Lottie
                    animationData={positive_lottie}
                    loop={true}
                    autoplay={true}
                    style={{ width: 40, height: 40 }}
                  />
                ) : (
                  <Lottie
                    animationData={negative_lottie}
                    loop={true}
                    autoplay={true}
                    style={{ width: 40, height: 40 }}
                  />
                )}
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Compared to last month
              </p>
            </div>
          </div>

          {/* Bar Chart Section */}
          <div className="w-full sm:flex-1 bg-white border border-gray-200 rounded-xl p-4 shadow-md">
            {selectedChart == "Chart For SE" ? (
              <SalesReportBarChart pickups={filteredPickups} />
            ) : selectedChart == "Chart For City" ? (
              <SalesReportBarChartCity pickups={filteredPickups} />
            ) : (
              ""
            )}
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
                  "Source",
                  "Pickup Area",
                  "Pickup Status",
                  "Payment Confirmed At",
                  "Booked By",
                  "Pickup Person",
                  "Status",
                  "Sales Close",
                  "Payment Proof",
                  "Details",
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
                      <td className="py-3 px-4 border">{pickup.Source}</td>
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
                      <td className="px-4 py-2 text-center">
                        <img
                          className="w-8 cursor-pointer mt-3"
                          src="more-icon.svg"
                          onClick={() => handleMoreIconClick(pickup)} // On click, show details in modal
                        />
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
      {isModalOpen && selectedPickup && (
        <ShipmentDetails
          selectedPickup={selectedPickup}
          closeModal={closeModal}
        />
      )}
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
