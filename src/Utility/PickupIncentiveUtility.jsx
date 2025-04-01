import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

function extractDate(dateString) {
  // Split the string at the '&' character and return the first part (the date)
  const datePart = dateString.split(" &")[0];
  return datePart;
}
function convertDateToTimestamp(dateString) {
  const result = extractDate(dateString);
  const [day, month, year] = result.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const seconds = Math.floor(date.getTime() / 1000);
  const nanoseconds = (date.getTime() % 1000) * 1e6;
  return {
    seconds,
    nanoseconds,
  };
}

async function fetchData(DateRange, startendrange) {
  try {
    let queryRef = collection(db, "pickup");
    // Conditional query based on selected DateRange
    if (DateRange === "This Week") {
      queryRef = query(
        collection(db, "pickup"),
        where("pickUpPersonNameStatus", "in", ["PICKUP COMPLETED"])
      );
    } else if (DateRange === "Last Week") {
      queryRef = query(
        collection(db, "pickup"),
        where("pickUpPersonNameStatus", "in", ["PICKUP COMPLETED"])
      );
    } else if (DateRange == "Select range") {
      queryRef = query(
        collection(db, "pickup"),
        where("pickUpPersonNameStatus", "in", ["PICKUP COMPLETED"])
      );
    }

    const querySnapshot = await getDocs(queryRef);
    const fetchedData = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return { ...data }; // Attach the parsed data
    });
    // Update the fetched data by converting pickupDatetime to Timestamp
    const updatedData = fetchedData.map((item) => ({
      ...item,
      pickupDatetime: convertDateToTimestamp(item.pickupDatetime),
    }));
    // Filter based on the selected DateRange
    const filteredData = updatedData.filter((item) =>
      DateRange === "This Week"
        ? item.pickupDatetime.seconds >= startendrange?.start?.seconds &&
          item.pickupDatetime.seconds <= startendrange?.end?.seconds
        : item.pickupDatetime.seconds >= startendrange?.start?.seconds &&
          item.pickupDatetime.seconds <= startendrange?.end?.seconds
    );

    return filteredData;
  } catch (error) {
    console.error("Error fetching pickup data:", error);
    return [];
  }
}

async function getTotalBookings(DateRange, startendrange) {
  const FeatchedResult = await fetchData(DateRange, startendrange);
  return FeatchedResult.length;
}

async function getTotalKGs(DateRange, startendrange) {
  var TotalKGs = 0;
  await fetchData(DateRange, startendrange).then((d) => {
    d?.map((value) => {
      TotalKGs += parseInt(value?.postPickupWeight?.replace(" KG", ""));
    });
  });
  return TotalKGs;
}

async function getKmDriven(DateRange, startendrange) {
  let KmDriven = 0;
  await fetchData(DateRange, startendrange).then((d) => {
    d?.forEach((value) => {
      KmDriven += value?.KmDriven ?? 0; // Use nullish coalescing to default to 0 if undefined
    });
  });
  return KmDriven;
}

async function SalesOverview(DateRange, startendrange) {
  const TotalPickupsCompleted = await getTotalBookings(
    DateRange,
    startendrange
  );

  return TotalPickupsCompleted;
}

const groupByPickupBookedBy = async (DateRange, startendrange) => {
  const data = await fetchData(DateRange, startendrange);
  const convertToDate = (timestamp) => {
    const date = new Date(timestamp.seconds * 1000);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return data.reduce((result, item) => {
    const name = item.pickUpPersonName;

    // Add a new group for the name if it doesn't exist
    if (!result[name]) {
      result[name] = {
        pickUpPersonName: name,
        bookings: [],
      };
    }

    // Format the date and add the booking to the group
    result[name].bookings.push({
      ...item,
      pickupDatetime: convertToDate(item.pickupDatetime),
    });
    return result;
  }, {});
};

async function TopPerformer(DateRange, startendrange) {
  const data = await groupByPickupBookedBy(DateRange, startendrange);
  let topPerformer = { name: null, totalkmsDriven: 0, totalBookings: 0 };
  for (const person in data) {
    const bookings = data[person].bookings;
    const totalkmsDriven = bookings.reduce(
      (sum, booking) => sum + (booking.KmDriven || 0),
      0
    );
    const totalBookings = bookings.length;
    if (totalkmsDriven > topPerformer.totalkmsDriven) {
      topPerformer = { name: person, totalkmsDriven, totalBookings };
    }
  }
  return topPerformer.name ? topPerformer.name : "N/A";
}

async function allPickupsData(DateRange, startendrange) {
  try {
    queryRef = query(collection(db, "pickup"));

    const querySnapshot = await getDocs(queryRef);
    const fetchedData = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return { ...data }; // Attach the parsed data
    });
    // Update the fetched data by converting pickupDatetime to Timestamp
    const updatedData = fetchedData.map((item) => ({
      ...item,
      pickupDatetime: convertDateToTimestamp(item.pickupDatetime),
    }));
    // Filter based on the selected DateRange
    const filteredData = updatedData.filter((item) =>
      DateRange === "This Week"
        ? item.pickupDatetime.seconds >= startendrange?.start?.seconds &&
          item.pickupDatetime.seconds <= startendrange?.end?.seconds
        : item.pickupDatetime.seconds >= startendrange?.start?.seconds &&
          item.pickupDatetime.seconds <= startendrange?.end?.seconds
    );

    return filteredData;
  } catch (error) {
    console.error("Error fetching pickup data:", error);
    return [];
  }
}

async function fetchLoginCredentials() {
  let collection_loginCre = collection(db, "LoginCredentials");
  const querySnapshot = await getDocs(collection_loginCre);
  const loginData = querySnapshot.docs.map((doc) => ({
    id: doc.id, // Include the document ID if needed
    ...doc.data(), // Spread the document fields
  }));
  const finalLoginCre = Object.entries(loginData[0])
    .filter(([email, details]) => {
      return details[3] === "CHENNAI" && details[2] === "Delivery Specialist";
    })
    .map(([email, details]) => ({
      email: details[1],
      name: details[0],
      role: details[2],
      location: details[3],
    }));
  return finalLoginCre;
}

const transformData = async (DateRange, startendrange) => {
  const data = await fetchData(DateRange, startendrange);
  // Convert Firebase timestamp to dd-mm-yyyy format
  const convertToDate = (timestamp) => {
    const date = new Date(timestamp.seconds * 1000);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };
  return Object.values(
    data.reduce((result, item) => {
      const formattedDate = convertToDate(item.pickupDatetime);
      const name = item.pickUpPersonName;
      const key = `${name}_${formattedDate}`;

      // Ensure the name exists in the dataset
      if (!result[name]) {
        result[name] = { name, [key]: { name_date: key, bookings: [] } };
      }

      // Ensure the date key exists under the name
      if (!result[name][key]) {
        result[name][key] = { name_date: key, bookings: [] };
      }

      // Push the booking into the relevant date key
      result[name][key].bookings.push({
        ...item,
        pickupDatetime: formattedDate,
      });
      return result;
    }, {})
  );
};

const downloadCSV = async (person, DateRange, startendrange) => {
  var dataset = await transformData(DateRange, startendrange);
  // Filter dataset for the specified person
  dataset = [dataset.find((entry) => entry.name === person)];
  if (dataset[0] == null) {
    return alert("Data not found!");
  }

  // Define CSV headers
  const headers = [
    // Personal Details
    "name",
    "name_date",
    "awbNumber",
    "consigneename",
    "consigneephonenumber",
    "consignorname",
    "consignorphonenumber",

    // Pickup Information
    "pickupBookedBy",
    "pickupDatetime",
    "packageConnectedDataTime",
    "pickUpPersonName",
    "KmDriven",
    "pickuparea",
    "pincode",
    "rtoIfAny",

    "pickUpPersonNameStatus",
    // Package Details
    "actualNoOfPackages",
    "actualWeight",
    "weightapx",
    "postPickupWeight",
    "discountCost",
    "costKg",
    "logisticCost",

    // Destination and Status
    "destination",
    "service",
    "status",

    // Vendor Details
    "vendorAwbnumber",
    "vendorName",
    "franchise",

    // Other Details
    "PaymentComfirmedDate",
  ];

  const rows = [];

  dataset.forEach((entry) => {
    Object.keys(entry).forEach((key) => {
      if (Array.isArray(entry[key]?.bookings)) {
        const groupRows = entry[key].bookings.map((booking, index) => {
          const row = headers.reduce((acc, header) => {
            acc[header] = booking[header] || entry[header] || ""; // Use booking data, fallback to entry data, or blank
            return acc;
          }, {});

          if (index === 0) {
            row.name = entry.name; // Include `name` only for the first row
            row.name_date = key; // Include `name_date` only for the first row
          } else {
            row.name = ""; // Blank for subsequent rows
            row.name_date = ""; // Blank for subsequent rows
          }

          return row;
        });
        rows.push(...groupRows, {}); // Add blank row after group
      }
    });
  });

  // Create CSV content
  const csvContent =
    headers.join(",") +
    "\n" +
    rows
      .map((row) =>
        headers
          .map((header) => (row[header] !== undefined ? row[header] : ""))
          .join(",")
      )
      .join("\n");

  // Trigger download
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${person}_dataset.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

// Total Pickups
// Pickups Pending

export default {
  fetchData: fetchData,
  getTotalBookings: getTotalBookings,
  SalesOverview: SalesOverview,
  getTotalKGs: getTotalKGs,
  getKmDriven: getKmDriven,
  groupByPickupBookedBy: groupByPickupBookedBy,
  TopPerformer: TopPerformer,
  allPickupsData: allPickupsData,
  fetchLoginCredentials: fetchLoginCredentials,
  downloadCSV: downloadCSV,
};
