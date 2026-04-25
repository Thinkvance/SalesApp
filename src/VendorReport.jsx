import { useEffect, useState } from "react";
import Nav from "./Nav.jsx";
import {
  collection,
  query,
  onSnapshot,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase.jsx";
import collectionName_BaseAwb from "./functions/collectionName.js";
import utilityFunctions from "./Utility/utilityFunctions.jsx";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import customParseFormat from "dayjs/plugin/customParseFormat";
import BarChartCom from "./salesReportCharts/BarChartCom.jsx";
import DB from "./DB/DB.js";
import ShipmentDetails from "./ShipmentDetails.jsx";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import SalesReportBarChartSVendor from "./Charts/SalesReportBarChartSVendor.jsx";
import EditShipmentModal from "./EditShipmentModal.jsx";
import { FiCheck, FiClipboard } from "react-icons/fi";
import formatFirestoreTimestamp from "./Utility/formatFirestoreTimestamp.js";
import BarChartCityWise from "./Charts/BarChartCityWise.jsx";
import vendorList from "./DB/vendorList.js";
import {
  parsePaymentConfirmedDate,
  paymentConfirmedDateMs,
  formatPaymentConfirmedDate,
} from "./Utility/paymentConfirmedDate";
dayjs.extend(customParseFormat);
dayjs.extend(isBetween);

function Accounts() {
  const [username, setUsername] = useState(null);
  const [role, setRole] = useState("");
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [ImageUrl, setImageUrl] = useState([]);
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

  const parseDate = (datetime) => paymentConfirmedDateMs(datetime);
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
    const parsedDate = parsePaymentConfirmedDate(pickup.PaymentComfirmedDate);
    if (!parsedDate) return false;

    const withinDateRange = dayjs(parsedDate).isBetween(from, to, "day", "[]");
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

  const totalInternalWeight = parseFloat(
    filteredPickups
      .reduce((sum, pickup) => sum + (Number(pickup.internalWeight) || 0), 0)
      .toFixed(2),
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
          const dateObj = parsePaymentConfirmedDate(item.PaymentComfirmedDate);
          if (!dateObj) return;

          octoberData.push({
            awbNumber: item.awbNumber || "",
            consignorname: item.consignorname || "",
            consignorphonenumber: item.consignorphonenumber || "",
            Source: item.Source || "",
            destination: item.destination || "",
            pickuparea: item.pickuparea || "",
            pickUpPersonNameStatus: item.pickUpPersonNameStatus || "NOT COMPLETED",
            pickupDatetime: formatFirestoreTimestamp(item.pickupDatetime) || "",
            pickupCompletedDatetime: formatFirestoreTimestamp(item.pickupCompletedDatetime) || "--",
            pickupBookedBy: item.pickupBookedBy || "",
            pickUpPersonName: item.pickUpPersonName || "",
            gstInvoiceNumber: item.gstInvoiceNumber || "No Invoice",
            PaymentComfirmedDate:
              formatPaymentConfirmedDate(item.PaymentComfirmedDate) || "",
            payment_Invoice_URL: item.payment_Invoice_URL || "",
            receiptNumber: item.receiptNumber || "",
            payment_Receipt_URL: item.payment_Receipt_URL || "",
            actualWeight: item.actualWeight || "",
            internalWeight: item.internalWeight || "",
            vendorName: item.vendorName || "",
            vendorAwbnumber: item.vendorAwbnumber || "",
            vendorpayment: item.vendorpayment || "",
            paymentMode: item.paymentMode || "",
            logisticCost: item.logisticCost || "",
            margin: item.margin || "",
            status: item.status || "",
          });
        });

      if (!octoberData.length) {
        alert("No October records found!");
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("October Data");

      ws.columns = [
        { header: "AWB Number", key: "awbNumber", width: 20 },
        { header: "Consignor Name", key: "consignorname", width: 25 },
        { header: "Phone Number", key: "consignorphonenumber", width: 20 },
        { header: "Source", key: "Source", width: 15 },
        { header: "Destination", key: "destination", width: 20 },
        { header: "Pickup Area", key: "pickuparea", width: 20 },
        { header: "Pickup Status", key: "pickUpPersonNameStatus", width: 20 },
        { header: "Pickup Booked Date", key: "pickupDatetime", width: 25 },
        { header: "Pickup Completed Date", key: "pickupCompletedDatetime", width: 25 },
        { header: "Booked By", key: "pickupBookedBy", width: 20 },
        { header: "Pickup Person", key: "pickUpPersonName", width: 20 },
        { header: "Invoice Number", key: "gstInvoiceNumber", width: 20 },
        { header: "Invoice Date", key: "PaymentComfirmedDate", width: 30 },
        { header: "Invoice URL", key: "payment_Invoice_URL", width: 30 },
        { header: "Receipt Number", key: "receiptNumber", width: 20 },
        { header: "Receipt URL", key: "payment_Receipt_URL", width: 30 },
        { header: "Final Weight", key: "actualWeight", width: 15 },
        { header: "Internal Weight", key: "internalWeight", width: 15 },
        { header: "Vendor", key: "vendorName", width: 20 },
        { header: "Vendor AWB Number", key: "vendorAwbnumber", width: 20 },
        { header: "Vendor Payment", key: "vendorpayment", width: 15 },
        { header: "Payment Mode", key: "paymentMode", width: 15 },
        { header: "Sales Close", key: "logisticCost", width: 15 },
        { header: "Margin", key: "margin", width: 15 },
        { header: "Status", key: "status", width: 20 },
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
              {vendorList.map((vendor) => (
                <option value={vendor}>{vendor}</option>
              ))}
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
          {/* === LEFT SIDE: Metric Cards (2x2 Grid) === */}
          {/* === LEFT SIDE: Metric Cards === */}
          <div className="flex flex-col gap-3 w-full lg:w-[280px] shrink-0">
            {/* Row 1: Total Sales */}
            <div className="bg-gradient-to-br from-purple-100 to-purple-200 border border-purple-300 rounded-2xl p-4 shadow-md">
              <h2 className="text-sm font-semibold text-purple-700 mb-1">
                Total Sales
              </h2>
              <p className="text-2xl font-bold text-purple-900">{totalSales}</p>
            </div>
            {/* Row 2: Total Weight */}
            <div className="bg-gradient-to-br from-orange-100 to-orange-200 border border-orange-300 rounded-2xl p-4 shadow-md">
              <h2 className="text-sm font-semibold text-orange-700 mb-1">
                Total Weight
              </h2>
              <p className="text-2xl font-bold text-orange-900">
                {totalInternalWeight.toLocaleString("en-IN")} KG
              </p>
            </div>
            {/* Row 2: Logistic Cost */}
            <div className="bg-gradient-to-br from-green-100 to-green-200 border border-green-300 rounded-2xl p-4 shadow-md">
              <h2 className="text-sm font-semibold text-green-700 mb-1">
                Total Logistic Cost
              </h2>
              <p className="text-2xl font-bold text-green-900">
                ₹ {totalLogisticsCost.toLocaleString("en-IN")}
              </p>
            </div>
            {/* Row 3: Total Margin */}
            <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 border border-yellow-300 rounded-2xl p-4 shadow-md">
              <h2 className="text-sm font-semibold text-yellow-700 mb-1">
                Total Margin
              </h2>
              <p className="text-2xl font-bold text-yellow-900">
                ₹ {totalMargin.toLocaleString("en-IN")}
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
                  "Phone Number",
                  "Source",
                  "Destination",
                  "Pickup Area",
                  "Pickup Status",
                  "Pickup Booked Date",
                  "Pickup Completed Date",
                  "Booked By",
                  "Pickup Person",
                  "Invoice Number",
                  "Invoice Date",
                  "Invoice",
                  "Receipt Number",
                  "Receipt",
                  "Final Weight",
                  "Internal Weight",
                  "Vendor",
                  "Vendor AWB Number",
                  "Vendor Payment",
                  "Payment Mode",
                  "Payment Proof",
                  "Sales Close",
                  "Margin",
                  "Status",
                  "Edit Details",
                  "View Details",
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
                      {/* AWB Number */}
                      <td className="py-3 px-4 border sticky left-0 bg-white z-10 min-w-[140px]">
                        {pickup.awbNumber}
                      </td>
                      {/* Consignor Name */}
                      <td className="py-3 px-4 border">
                        {pickup.consignorname}
                      </td>
                      {/* Phone Number */}
                      <td className="py-3 px-4 border">
                        {pickup.consignorphonenumber}
                      </td>
                      {/* Source */}
                      <td className="py-3 px-4 border">{pickup.Source}</td>
                      {/* Destination */}
                      <td className="py-3 px-4 border">{pickup.destination}</td>
                      {/* Pickup Area */}
                      <td className="py-3 px-4 border">{pickup.pickuparea}</td>
                      {/* Pickup Status */}
                      <td className="py-3 px-4 border">
                        {pickup.pickUpPersonNameStatus || "NOT COMPLETED"}
                      </td>
                      {/* Pickup Booked Date */}
                      <td className="py-3 px-4 border text-nowrap">
                        {formatFirestoreTimestamp(pickup.pickupDatetime)}
                      </td>
                      {/* Pickup Completed Date */}
                      <td className="py-3 px-4 border text-nowrap">
                        {formatFirestoreTimestamp(
                          pickup.pickupCompletedDatetime,
                        ) || "--"}
                      </td>
                      {/* Booked By */}
                      <td className="py-3 px-4 border">
                        {pickup.pickupBookedBy}
                      </td>
                      {/* Pickup Person */}
                      <td className="py-3 px-4 border">
                        {pickup.pickUpPersonName}
                      </td>
                      {/* Invoice Number */}
                      <td className="py-3 px-4 border text-nowrap">
                        {pickup.gstInvoiceNumber
                          ? pickup.gstInvoiceNumber
                          : "No Invoice"}
                      </td>
                      {/* Invoice Date */}
                      <td className="py-3 px-4 border text-nowrap">
                        {formatPaymentConfirmedDate(
                          pickup.PaymentComfirmedDate,
                        )}
                      </td>
                      {/* Invoice */}
                      <td className="py-3 px-4 border text-nowrap">
                        {pickup.payment_Invoice_URL ? (
                          <a
                            href={pickup.payment_Invoice_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-green-700 active:scale-95 transition-all duration-200"
                          >
                            📄 View Invoice
                          </a>
                        ) : (
                          "No Invoice"
                        )}
                      </td>
                      {/* Receipt Number */}
                      <td className="py-3 px-4 border text-nowrap">
                        {pickup.receiptNumber}
                      </td>
                      {/* Receipt */}
                      <td className="py-3 px-4 border text-nowrap">
                        <a
                          href={pickup.payment_Receipt_URL}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#714DD9] text-white text-sm font-medium rounded-lg shadow-sm hover:bg-[#886dda] active:scale-95 transition-all duration-200"
                        >
                          📄 View Receipt
                        </a>
                      </td>
                      {/* Final Weight */}
                      <td className="py-3 px-4 border">
                        {pickup.actualWeight}
                      </td>
                      {/* Internal Weight */}
                      <td className="py-3 px-4 border">
                        {pickup.internalWeight}
                      </td>
                      {/* Vendor */}
                      <td className="py-3 px-4 border">
                        {pickup.vendorName ? pickup.vendorName : "--"}
                      </td>
                      {/* Vendor AWB Number */}
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
                      {/* Vendor Payment */}
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
                      {/* Payment Mode */}
                      <td className="py-3 px-4 border">
                        {pickup.paymentMode ? pickup.paymentMode : "--"}
                      </td>
                      {/* Payment Proof */}
                      <td className="py-3 px-4 border">
                        {pickup.paymentProof ? (
                          <img
                            onClick={() => {
                              setShowModal(true);
                              const proof = pickup.paymentProof;
                              setImageUrl(
                                Array.isArray(proof) ? proof : [proof],
                              );
                            }}
                            src="Vector.svg"
                            className="cursor-pointer w-5 ml-auto mr-auto"
                            alt=""
                          />
                        ) : (
                          <p className="w-5 ml-auto mr-auto">--</p>
                        )}
                      </td>
                      {/* Sales Close */}
                      <td className="py-3 px-4 border">
                        {pickup.logisticCost || "--"}
                      </td>
                      {/* Margin */}
                      <td className="py-3 px-4 border">
                        {pickup.margin || "--"}
                      </td>
                      {/* Status */}
                      <td className="py-3 px-4 border text-center">
                        {pickup.status}
                      </td>
                      {/* Edit Details */}
                      <td className="px-4 py-2 text-center">
                        <button
                          className="text-sm px-4 py-2 rounded-lg border border-purple-300 text-purple-700
             hover:bg-purple-50 transition-all duration-200"
                          onClick={() => handleEditClick(pickup)}
                        >
                          Edit
                        </button>
                      </td>
                      {/* View Details */}
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
                  <td colSpan="28" className="text-center py-4 text-gray-600">
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

            <div className="flex flex-col gap-3 items-center max-h-[70vh] overflow-y-auto">
              {ImageUrl.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Payment Proof ${idx + 1}`}
                  className="rounded-xl max-h-[400px] object-contain border border-gray-200 shadow-sm"
                />
              ))}
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
