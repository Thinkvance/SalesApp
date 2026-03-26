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
import DB from "./DB/DB";
import ShipmentDetails from "./ShipmentDetails";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import SalesReportBarChartSVendor from "./Charts/SalesReportBarChartSVendor";
import EditShipmentModal from "./EditShipmentModal";
import { FiCheck, FiClipboard } from "react-icons/fi";
import formatFirestoreTimestamp from "./Utility/formatFirestoreTimestamp";
import BarChartCityWise from "./Charts/BarChartCityWise";
dayjs.extend(customParseFormat);
dayjs.extend(isBetween);

function Accounts() {
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
  const [SelectedCity, setSelectedCity] = useState("All");
  const [selectedSource, setselectedSource] = useState("All");
  const [selectedVendor, setselectedVendor] = useState("All");
  const [selectedVendorAWBnumber, setselectedVendorAWBnumber] = useState("");
  const [selectedChart, setselectedChart] = useState("Vendor-wise Chart");

  const [isModalOpen, setIsModalOpen] = useState(false); // State to control modal visibility
  const [selectedPickup, setSelectedPickup] = useState(null); // State to hold the selected pickup for modal

  const [pickupPersons, setPickupPersons] = useState([""]);
  const [editPickup, setEditPickup] = useState(null);
  const [isModalOpenEdit, setModalOpenEdit] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [Editedvalue, setEditedvalue] = useState(null);
  const [copied, setCopied] = useState(null);
  const [selectedModeOfPay, setselectedModeOfPay] = useState("All");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "LoginCredentials"),
      (querySnapshot) => {
        const names = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          Object.values(data).forEach((arr) => {
            if (["sales admin", "sales associate", "Manager"].includes(arr[2]))
              names.push(arr[0]); // Push only the name (index 0)
          });
        });
        setPickupPersons(names);
      },
      (error) => {
        console.error("Error fetching pickup persons: ", error);
      },
    );

    return () => unsubscribe();
  }, []);

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPickup(null);
  };

  const handleMoreIconClick = (pickup) => {
    setSelectedPickup(pickup);
    setIsModalOpen(true);
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
          where("awbNumber", "==", awbNumber),
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
              }),
            );

            setPickups((prevPickups) =>
              prevPickups.map((pickup) =>
                pickup.id === pickupId
                  ? {
                      ...pickup,
                      vendorpayment: newVendorPayment,
                      margin: margin,
                    }
                  : pickup,
              ),
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
                location === "HQ CHENNAI" ? "CHENNAI" : location,
              ),
            ];

      const unsubscribes = [];
      where("status", "in", ["SHIPMENT CONNECTED"]);

      Promise.all(
        collectionNames.map((name) => {
          const q = query(
            collection(db, name),
            where("status", "in", ["SHIPMENT CONNECTED"]),
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
        }),
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
    const matchedModeOfPay =
      selectedModeOfPay === "All" ||
      pickup.paymentMode?.toLowerCase() === selectedModeOfPay.toLowerCase();

    const matchedvendor =
      selectedVendor === "All" ||
      pickup.vendorName?.toLowerCase() === selectedVendor.toLowerCase();

    const matchedVendorAWBnumber =
      selectedVendorAWBnumber === ""
        ? true // include all
        : pickup?.vendorAwbnumber != null &&
          String(pickup.vendorAwbnumber).toLowerCase() ===
            String(selectedVendorAWBnumber).toLowerCase();

    return (
      withinDateRange &&
      matchesAwb &&
      matchesPhone &&
      matchesPickupPerson &&
      matchesBookedBy &&
      matchedCity &&
      matchedsource &&
      matchedvendor &&
      matchedVendorAWBnumber &&
      matchedModeOfPay
    );
  });

  const totalSales = filteredPickups.length;

  const totalLogisticsCost = filteredPickups.reduce(
    (sum, pickup) => sum + (pickup.logisticCost || 0),
    0,
  );

  const totalMargin = filteredPickups.reduce(
    (sum, pickup) => sum + (pickup.margin || 0),
    0,
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
    }, {}),
  );

  const exportOctoberData = async () => {
    try {
      const octoberData = [];

      [...filteredPickups]
        .sort(
          (a, b) =>
            parseDate(b.PaymentComfirmedDate) -
            parseDate(a.PaymentComfirmedDate),
        )
        .map((item) => {
          const rawDate = item.PaymentComfirmedDate;
          if (!rawDate) return;

          let dateObj;

          if (rawDate.toDate) {
            dateObj = rawDate.toDate();
          } else if (typeof rawDate === "string") {
            const [datePart, timePart, modifier] = rawDate.split(" ");
            if (!datePart || !timePart || !modifier) return;

            const [day, month, year] = datePart.split("-").map(Number);
            let [hours, minutes, seconds] = timePart.split(":").map(Number);

            if (modifier === "PM" && hours !== 12) hours += 12;
            if (modifier === "AM" && hours === 12) hours = 0;

            dateObj = new Date(year, month - 1, day, hours, minutes, seconds);
          } else {
            return;
          }

          octoberData.push({
            PaymentComfirmedDate: rawDate,
            status: item.status,
            consignorname: item.consignorname || "",
            awbNumber: item.awbNumber || "",
            vendorName: item.vendorName || "",
            actualWeight: item.internalWeight || "",
            pickuparea: item.pickuparea || "",
            destination: item.destination || "",
            logisticCost: item.logisticCost || "",
            paymentMode: item.paymentMode || "",
            payment_Receipt_URL: item.payment_Receipt_URL || "",
          });
        });

      if (!octoberData.length) {
        alert("No October records found!");
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("October Data");

      ws.columns = [
        {
          header: "Date",
          key: "PaymentComfirmedDate",
          width: 30,
        },
        { header: "status", key: "status", width: 25 },
        { header: "Customer", key: "consignorname", width: 25 },
        { header: "Receipt No", key: "awbNumber", width: 20 },
        { header: "Vendor", key: "vendorName", width: 20 },
        { header: "Weight", key: "actualWeight", width: 15 },
        { header: "Pickup Area", key: "pickuparea", width: 20 },
        { header: "Country", key: "destination", width: 20 },
        { header: "Sale price", key: "logisticCost", width: 15 },
        { header: "Payment Mode", key: "paymentMode", width: 15 },
        { header: "Invoice", key: "payment_Receipt_URL", width: 15 },
      ];

      octoberData.forEach((row) => ws.addRow(row));

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `${filterOption}-Vendor-Data.xlsx`);

      // alert("✅ Excel downloaded successfully!");
    } catch (error) {
      console.error("❌ Export Error:", error);
      alert("Something went wrong while exporting!");
    }
  };

  const handleEditClick = (pickup) => {
    setEditPickup({ ...pickup });
    setModalOpenEdit(true);
  };
  function formatString(input) {
    return input.trim().replace(/\s+/g, " ");
  }

  const handleSave = async (value) => {
    setLoadingEdit(true);
    try {
      const q = query(
        collection(db, DB.db_collection),
        where("awbNumber", "==", value.awbNumber),
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, {
          vendorName: value.vendorName,
          consignorname: value.consignorname,
          service: value.service,
          actualWeight: formatString(value.actualWeight),
          logisticCost: parseInt(value.logisticCost),
          vendorAwbnumber: value.vendorAwbnumber,
          internalWeight: formatString(value.internalWeight),
        });
      } else {
        console.error("No document found with the given AWB number.");
      }
    } catch (error) {
      console.log("error", error);
    } finally {
      setLoadingEdit(false);
      setModalOpenEdit(false);
    }
  };
  const handleCopy = (vendorAwbnumber) => {
    navigator.clipboard.writeText(vendorAwbnumber);
    setCopied(vendorAwbnumber); // mark only this awb as copied
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <>
      <Nav />
      <div className="container mx-auto p-6 rounded-lg">
        <h1 className="text-3xl font-bold mb-6 text-[#714DD9]">
          Vendor Report
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
          <div className="w-fit col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
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
              <option value="MAYILADUTHURAI">mayiladuthurai</option>
            </select>
          </div>
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
              <option value="B To C">B To C</option>
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
              Mode Of Pay
            </label>
            <select
              value={selectedModeOfPay}
              onChange={(e) => setselectedModeOfPay(e.target.value)}
              className="border rounded  input-style w-full"
            >
              <option value="All">All</option>
              <option value="Cash">Cash</option>
              <option value="Credit/Debit Cards">Credit/Debit Cards</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          <div className="w-fit col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor
            </label>
            <select
              value={selectedVendor}
              onChange={(e) => setselectedVendor(e.target.value)}
              className="border rounded  input-style w-full"
            >
              <option value="All">All</option>
              <option value="DHL">DHL</option>
              <option value="Aramex">Aramex</option>
              <option value="UPS">UPS</option>
              <option value="ExPlus">ExPlus</option>
              <option value="TurboFox">TurboFox</option>
              <option value="ICL SELF">ICL SELF</option>
              <option value="ICL FedEx">ICL FedEx</option>
              <option value="ATLANTIC">ATLANTIC</option>
              <option value="IMD Courier">IMD Courier</option>
              <option value="Sky Express">Sky Express</option>
              <option value="World First">World First</option>
              <option value="Legend Xpress">Legend Xpress</option>
            </select>
          </div>

          <div className="w-fit col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Chart For
            </label>
            <select
              value={selectedChart}
              onChange={(e) => setselectedChart(e.target.value)}
              className="border rounded  input-style w-full"
            >
              <option value="Sales Executive Chart">
                Sales Executive Chart
              </option>
              <option value="Vendor-wise Chart">Vendor-wise Chart</option>
              <option value="City-wise Chart">City-wise Chart</option>
            </select>
          </div>

          <div className="w-fit col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search By Vendor AWBNumber
            </label>
            <input
              value={selectedVendorAWBnumber}
              onChange={(e) => setselectedVendorAWBnumber(e.target.value)}
              type="text"
              className="border rounded  input-style w-full"
              placeholder="Vendor AWB Number"
            />
          </div>
          <button
            onClick={exportOctoberData}
            className="bg-[#714DD9] text-white px-4 py-2 rounded-lg"
          >
            Export Data
          </button>
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

        <div className="flex flex-col lg:flex-row gap-8 mb-10 items-start justify-between">
          {/* === LEFT SIDE: Metric Cards (Column) === */}
          <div className="flex flex-col gap-6 w-full lg:w-1/4">
            {/* Total Sales */}
            <div className="bg-gradient-to-br from-purple-100 to-purple-200 border border-purple-300 rounded-2xl p-6 shadow-md hover:shadow-lg transition-transform hover:scale-[1.02] duration-300">
              <h2 className="text-lg font-semibold text-purple-700 mb-1">
                Total Sales
              </h2>
              <p className="text-3xl font-bold text-purple-900">{totalSales}</p>
            </div>

            {/* Total Logistic Cost */}
            <div className="bg-gradient-to-br from-green-100 to-green-200 border border-green-300 rounded-2xl p-6 shadow-md hover:shadow-lg transition-transform hover:scale-[1.02] duration-300">
              <h2 className="text-lg font-semibold text-green-700 mb-1">
                Total Logistic Cost
              </h2>
              <p className="text-3xl font-bold text-green-900">
                ₹ {totalLogisticsCost}
              </p>
            </div>

            {/* Total Margin */}
            <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 border border-yellow-300 rounded-2xl p-6 shadow-md hover:shadow-lg transition-transform hover:scale-[1.02] duration-300">
              <h2 className="text-lg font-semibold text-yellow-700 mb-1">
                Total Margin
              </h2>
              <p className="text-3xl font-bold text-yellow-900">
                ₹ {totalMargin}
              </p>
            </div>
          </div>

          {/* === RIGHT SIDE: Chart Section === */}
          <div className="w-full lg:w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {selectedChart === "Sales Executive Chart"
                  ? "Sales Executive Performance"
                  : "Vendor Performance"}
              </h2>
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  Data from{" "}
                  <span className="font-semibold">{from.format("DD MMM")}</span>{" "}
                  to{" "}
                  <span className="font-semibold">
                    {to.format("DD MMM YYYY")}
                  </span>
                </p>
              </div>
              <span className="text-sm text-gray-500">
                Total Margin:{" "}
                <strong className="text-gray-900">₹ {totalMargin}</strong>
              </span>
            </div>

            <div className="mb-0">
              {selectedChart === "Sales Executive Chart" ? (
                <BarChartCom salesData={salesData} />
              ) : selectedChart === "City-wise Chart" ? (
                <BarChartCityWise pickups={filteredPickups} />
              ) : (
                <SalesReportBarChartSVendor pickups={filteredPickups} />
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-hidden border scrollbar-hide relative">
          <table className="min-w-max table-auto bg-white border border-gray-200 rounded-lg shadow">
            <thead className="bg-[#714DD9] text-white sticky top-0 z-30">
              <tr>
                {[
                  "AWB Number",
                  "Consignor Name",
                  "Phone",
                  "Destination",
                  "Source",
                  "Pickup Area",
                  "Pickup Status",
                  "Invoice Date",
                  "Pickup Booked Date",
                  "Invoice Number",
                  "Invoice",
                  "Booked By",
                  "Pickup Person",
                  "Status",
                  "Final Weight",
                  "Internal Weight",
                  "Sales Close",
                  "Vendor Payment",
                  "Margin",
                  "Vendor AWB Number",
                  "Vendor",
                  "Payment Mode",
                  "Payment Proof",
                  "Edit Details",
                  "Details",
                ].map((head, i) => (
                  <th
                    key={i}
                    className={`py-3 px-4 border ${
                      i === 0 ? "sticky left-0 bg-[#714DD9] z-20" : ""
                    }`}
                  >
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
                      parseDate(a.PaymentComfirmedDate),
                  )
                  .map((pickup, idx) => (
                    <tr
                      key={pickup.id}
                      className={idx % 2 === 0 ? "bg-gray-50" : ""}
                    >
                      <td className="py-3 px-4 border sticky left-0 bg-white z-10 min-w-[140px]">
                        {pickup.awbNumber}
                      </td>
                      <td className="py-3 px-4 border">
                        {pickup.consignorname}
                      </td>
                      <td className="py-3 px-4 border">
                        {pickup.consignorphonenumber}
                      </td>
                      <td className="py-3 px-4 border">{pickup.destination}</td>

                      <td className="py-3 px-4 border">{pickup.Source}</td>
                      <td className="py-3 px-4 border">{pickup.pickuparea}</td>
                      <td className="py-3 px-4 border">
                        {pickup.pickUpPersonNameStatus || "NOT COMPLETED"}
                      </td>
                      <td className="py-3 px-4 border text-nowrap">
                        {pickup.PaymentComfirmedDate}
                      </td>
                      <td className="py-3 px-4 border text-nowrap">
                        {formatFirestoreTimestamp(pickup.pickupDatetime)}
                      </td>
                      <td className="py-3 px-4 border text-nowrap">
                        {pickup.receiptNumber}
                      </td>
                      <td className="py-3 px-4 border text-nowrap">
                        <a
                          href={pickup.payment_Receipt_URL}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#714DD9] text-white text-sm font-medium rounded-lg shadow-sm hover:bg-[#886dda] active:scale-95 transition-all duration-200"
                        >
                          📄 View Invoice
                        </a>
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
                        {pickup.actualWeight}
                      </td>
                      <td className="py-3 px-4 border">
                        {pickup.internalWeight}
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
                                    : p,
                                ),
                              );
                            }
                          }}
                          onBlur={() =>
                            handleBlur(
                              pickup.id,
                              pickup.awbNumber,
                              parseInt(pickup.vendorpayment || "0"),
                            )
                          }
                          className="w-full h-full text-center resize-none bg-transparent p-2 focus:ring-1 focus:ring-purple-500 rounded-md"
                        />
                      </td>
                      <td className="py-3 px-4 border">
                        {pickup.margin || "--"}
                      </td>
                      <td className="py-3 px-4 border">
                        <div className="flex justify-between">
                          {pickup.vendorAwbnumber || "--"}
                          {pickup.vendorAwbnumber && (
                            <button
                              onClick={() => handleCopy(pickup.vendorAwbnumber)}
                              className="text-purple-600 hover:text-purple-800 transition-colors duration-200"
                              title="Copy AWB"
                            >
                              {copied === pickup.vendorAwbnumber ? (
                                <FiCheck
                                  size={20}
                                  className="text-green-600 animate-bounce"
                                />
                              ) : (
                                <FiClipboard
                                  size={20}
                                  className="hover:scale-110 transition-transform"
                                />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 border">
                        {pickup.vendorName ? pickup.vendorName : "--"}
                      </td>
                      <td className="py-3 px-4 border">
                        {pickup.paymentMode ? pickup.paymentMode : "--"}
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
                        <button
                          className="text-sm px-4 py-2 rounded-lg border border-purple-300 text-purple-700 
             hover:bg-purple-50 transition-all duration-200"
                          onClick={() => handleEditClick(pickup)}
                        >
                          Edit
                        </button>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          className="text-sm px-4 py-2 rounded-lg border border-purple-300 text-purple-700 
             hover:bg-purple-50 transition-all duration-200"
                          onClick={() => handleMoreIconClick(pickup)}
                        >
                          View More
                        </button>
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
      {isModalOpenEdit && (
        <EditShipmentModal
          onChange={setEditedvalue}
          pickup={editPickup}
          onClose={() => setModalOpenEdit(false)}
          onSave={handleSave}
          loadingEdit={loadingEdit}
        />
      )}
    </>
  );
}

export default Accounts;
