import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import { format, startOfWeek, addDays, subWeeks } from "date-fns";
import { db, messaging } from "../firebase";
import toast from "react-hot-toast";
import axios from "axios";
import { getToken } from "firebase/messaging";
import { revokeAccessToken } from "firebase/auth";

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

function timestamptostr(timestamp) {
  // Convert seconds to milliseconds and create a Date object
  const date = new Date(timestamp.seconds * 1000);
  // Format the date to dd-mm-yyyy
  const day = String(date.getDate()).padStart(2, "0"); // Ensure two digits for the day
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]; // List of months

const currentDate = new Date();

// Get current week's range (Saturday to Friday)
const currentWeekStart = startOfWeek(currentDate, { weekStartsOn: 6 }); // Start on Saturday
const currentWeekEnd = addDays(currentWeekStart, 6); // End on Friday
// Get last week's range (Saturday to Friday)
const lastWeekStart = subWeeks(currentWeekStart, 1);
const lastWeekEnd = addDays(lastWeekStart, 6);
// Format dates to "yyyy-MM-dd" format for comparison
const formattedStartDate = Timestamp.fromDate(
  new Date(format(currentWeekStart, "yyyy-MM-dd"))
);
const formattedEndDate = Timestamp.fromDate(
  new Date(format(currentWeekEnd, "yyyy-MM-dd"))
);

const formattedLastWeekStart = Timestamp.fromDate(
  new Date(format(lastWeekStart, "yyyy-MM-dd"))
);

const formattedLastWeekEnd = Timestamp.fromDate(
  new Date(format(lastWeekEnd, "yyyy-MM-dd"))
);

async function fetchStartEndDate(DateRange, startendrange) {
  return {
    startDate: timestamptostr(startendrange.start),
    endDate: timestamptostr(startendrange.end),
  };
}

async function fetchData(DateRange, startendrange) {
  try {
    let queryRef = collection(db, "pickup");
    // Conditional query based on selected DateRange
    if (DateRange === "This Week") {
      queryRef = query(
        collection(db, "pickup"),
        where("status", "in", ["PAYMENT DONE", "SHIPMENT CONNECTED"])
      );
    } else if (DateRange === "Last Week") {
      queryRef = query(
        collection(db, "pickup"),
        where("status", "in", ["PAYMENT DONE", "SHIPMENT CONNECTED"])
      );
    } else if (DateRange == "Select range") {
      queryRef = query(
        collection(db, "pickup"),
        where("status", "in", ["PAYMENT DONE", "SHIPMENT CONNECTED"])
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

async function getRevenue(DateRange, startendrange) {
  var Revenue = 0;
  await fetchData(DateRange, startendrange).then((d) => {
    d?.map((value) => {
      Revenue += value.logisticCost;
    });
  });
  return Revenue.toFixed(2);
}

async function getTotalBookings(DateRange, startendrange) {
  const FeatchedResult = await fetchData(DateRange, startendrange);
  return FeatchedResult.length;
}

async function AvgBookingValue(DateRange, startendrange) {
  const revenue = await getRevenue(DateRange, startendrange);
  const totalBookings = await getTotalBookings(DateRange, startendrange);
  const result = totalBookings === 0 ? 0 : revenue / totalBookings;
  return result.toFixed(2);
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
      return (
        (details[3] === "CHENNAI" && details[2] === "sales associate") ||
        details[2] === "sales admin"
      );
    })
    .map(([email, details]) => ({
      email: details[1],
      name: details[0],
      role: details[2],
      location: details[3],
    }));
  return finalLoginCre;
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
    const name = item.pickupBookedBy;

    // Add a new group for the name if it doesn't exist
    if (!result[name]) {
      result[name] = {
        pickupBookedBy: name,
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
  let topPerformer = { name: null, totalCost: 0, totalBookings: 0 };
  for (const person in data) {
    const bookings = data[person].bookings;
    const totalCost = bookings.reduce(
      (sum, booking) => sum + (booking.logisticCost || 0),
      0
    );
    const totalBookings = bookings.length;
    if (totalCost > topPerformer.totalCost) {
      topPerformer = { name: person, totalCost, totalBookings };
    }
  }
  return topPerformer.name ? topPerformer.name : "N/A";
}

function IncentiveCalculator(BookingCount) {
  if (BookingCount < 3) {
    return 0; // No incentive if less than 3 bookings
  } else if (BookingCount === 3) {
    return BookingCount * 50; // Incentive for 3 bookings: 3 * 50
  } else if (BookingCount >= 4 && BookingCount <= 5) {
    return BookingCount * 60; // Incentive for 4-5 bookings: 3 * 60
  } else if (BookingCount >= 6 && BookingCount <= 7) {
    return BookingCount * 75; // Incentive for 6-7 bookings: 3 * 75
  }
  return 0; // Default, no incentive
}

async function calculateTotalIncentive(DateRange, startendrange, name) {
  let data = await transformData(DateRange, startendrange);
  data = [data.find((d) => d.name == name)];
  let totalIncentive = 0;
  for (const person in data) {
    if (person !== "name") {
      const personData = data[person];
      for (const dayKey in personData) {
        if (dayKey !== "name") {
          const dayData = personData[dayKey];
          const bookingCount = dayData.bookings.length;
          // Only calculate incentive if bookings are greater than or equal to 3
          if (bookingCount >= 3) {
            const dayIncentive = IncentiveCalculator(bookingCount);
            totalIncentive += dayIncentive;
          }
        }
      }
    }
  }
  return totalIncentive;
}

// Transform data into the required format
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
      const name = item.pickupBookedBy;
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
    "pickuparea",
    "pincode",
    "rtoIfAny",

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

function getSalesPersonBookings(person) {
  return groupedData[person]?.bookings.length
    ? groupedData[person]?.bookings.length
    : 0;
}

function calculateCost(country, weight, data) {
  if (!data) {
    return "";
  }
  const temp = data[0].data;
  const countryIndex = temp[0]["COUNTRY/ZONE"].indexOf(country.trim());
  if (countryIndex === -1) {
    return `Country ${country} not found.`;
  }
  const weightKey = `${weight.toFixed(3)} gms `;
  const weightData = temp.find((item) => weightKey in item);
  if (!weightData) {
    return `Weight ${weight} gms not found.`;
  }
  return weightData[weightKey][countryIndex];
}

function rolesPermissions() {
  let { role } = JSON.parse(localStorage.getItem("LoginCredentials"));
  if (role == "Manager") {
    return {
      PickupManagement: [
        "Pickup-Booking",
        "all-pickups",
        "logistics-Dashboard",
        "Sales-Incentive",
        "Pickup-Incentive",
      ],
      RateManagement: ["Sale-rates", "vendor-rates"],
    };
  }
  if (role == "sales associate") {
    return {
      PickupManagement: ["Pickup-Booking", "Pickups"],
      RateManagement: ["Sale-rates"],
    };
  }
  if (role == "sales admin") {
    return {
      PickupManagement: [
        "Pickup-Booking",
        "Pickups",
        "Sales-Incentive",
        "Pickup-Incentive",
      ],
      RateManagement: ["Sale-rates"],
    };
  }
}

function formatRouteName(route) {
  return route
    .replace(/-/g, " ") // Replace hyphens with spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize each word
}

const playNotificationSound = (fileName) => {
  const toastError = {
    duration: 4000,
    position: "top-right",
    icon: "❌", // Change icon to represent an error
    iconTheme: {
      primary: "#ff0000", // Red for error
      secondary: "#fff", // White for contrast
    },
    ariaProps: {
      role: "alert", // Role for error message
      "aria-live": "assertive", // More urgent for errors
    },
    removeDelay: 1000,
  };
  try {
    const audio = new Audio(fileName); // Path to your sound file
    audio.play().catch(() => {
      toast.error("Audio playback failed!", toastError);
    });
  } catch (error) {
    toast.error("Error in NotificationSound!", toastError);
  }
};

function SuccessNotify(value) {
  toast.success(value, {
    duration: 4000,
    position: "top-right",
    // Custom Icon
    icon: "✅", // Change icon to represent success
    // Change colors of success icon
    iconTheme: {
      primary: "#28a745", // Green for success
      secondary: "#fff", // White for contrast
    },
    // Aria
    ariaProps: {
      role: "status", // Role for success message
      "aria-live": "polite", // Less urgent for success
    },
    // Additional Configuration
    removeDelay: 1000,
  });
}

function ErrorNotify(value) {
  playNotificationSound("/errorNotification.mp3");
  toast.error(value, {
    duration: 4000,
    position: "top-right",
    icon: "❌", // Change icon to represent an error
    iconTheme: {
      primary: "#ff0000", // Red for error
      secondary: "#fff", // White for contrast
    },
    ariaProps: {
      role: "alert", // Role for error message
      "aria-live": "assertive", // More urgent for errors
    },
    removeDelay: 1000,
  });
}

function foregroundNotification(value) {
  playNotificationSound("/notification1.mp3");
  toast.success(value, {
    duration: 4000,
    position: "top-right",
    // Custom Icon
    icon: "🔔", // Change icon to represent success
    // Change colors of success icon
    iconTheme: {
      primary: "#28a745", // Green for success
      secondary: "#fff", // White for contrast
    },
    // Aria
    ariaProps: {
      role: "status", // Role for success message
      "aria-live": "polite", // Less urgent for success
    },
    // Additional Configuration
    removeDelay: 1000,
  });
}

function findAdminRole(data) {
  const adminData = [];
  // Iterate through each key-value pair in the object
  for (const [key, value] of Object.entries(data[0])) {
    if (Array.isArray(value) && value[2] === "admin") {
      adminData.push({
        email: key,
        name: value[0],
        role: value[2],
        location: value[3],
      });
    }
  }
  return adminData;
}

async function LoginCredentials() {
  try {
    const querySnapshot = await getDocs(collection(db, "LoginCredentials"));
    const credentials = querySnapshot.docs.map((doc) => ({
      id: doc.id, // Document ID
      ...doc.data(), // Document data
    }));
    return findAdminRole(credentials);
  } catch (error) {
    ErrorNotify("Error fetching LoginCredentials");
    return; // Return null in case of an error
  }
}

async function fetchNotificationToken(userEmail) {
  try {
    const tokenDoc = doc(db, "NotificationToken", userEmail);
    const tokenSnapshot = await getDoc(tokenDoc);
    if (tokenSnapshot.exists()) {
      const tokenData = tokenSnapshot.data();
      return tokenData.token; // Return the token
    } else {
      ErrorNotify(`No token found for userEmail: ${userEmail}`);
      return; // Return null if no token exists
    }
  } catch (error) {
    ErrorNotify("Error fetching notification token:", error);
    return; // Return null in case of an error
  }
}

async function getTokenService() {
  const token = await getToken(messaging, {
    vapidKey:
      "BGHuL0LEuljqK5PK6bKwb2FhKvUpLxkVbt7X6Ud952TO6qX5NbjruL_4x0ppsosgKxtopueNWBayMlGp1bhH_uE",
  })
    .then((currentToken) => {
      if (currentToken) {
        return currentToken;
      } else {
        ErrorNotify(
          "No registration token available. Request permission to generate one."
        );
      }
    })
    .catch((err) => {
      ErrorNotify("An error occurred while retrieving token!");
    });

  return token;
}

async function fetchAndStoreToken(username) {
  const token = await getTokenService();
  // Store the token in Firestore under the NotificationToken collection
  try {
    await setDoc(doc(db, "NotificationToken", username), {
      token: token, // Store the token under the user's username
    });
  } catch (error) {
    ErrorNotify("Error storing token in Firestore");
  }
}

async function fetchLoginedUserEmail() {
  return JSON.parse(localStorage.getItem("LoginCredentials")).email;
}

async function fetchLoginedUserName() {
  return JSON.parse(localStorage.getItem("LoginCredentials")).name;
}

const sendNotification = async () => {
  await fetchAndStoreToken(await fetchLoginedUserEmail());
  const userData = await LoginCredentials();
  const currentUserCre = await fetchLoginedUserEmail();

  const admin_token = await fetchNotificationToken(userData[0].email);
  const currentUserToken = await fetchNotificationToken(currentUserCre);

  const notificationPayload1 = {
    to: currentUserToken,
    title: "Pickup Request Confirmed",
    body: "A pickup has been scheduled. Review the details to coordinate smoothly.",
    image: "https://www.shiphit.in/images/logo.png",
    link: "",
  };

  const notificationPayload2 = {
    to: admin_token,
    title: "📦 New Pickup Request Booked!",
    body: `
A new pickup request has been successfully booked by **${await fetchLoginedUserName()}**.  
Please review the details and proceed accordingly.  
`,
    image: "",
    link: "",
  };

  try {
    // Send both notifications concurrently using Promise.all
    await Promise.all([
      axios.post(
        "https://shiphit-backend.onrender.com/sendNotification",
        notificationPayload1
      ),
      axios.post(
        "https://shiphit-backend.onrender.com/sendNotification",
        notificationPayload2
      ),
    ]);
  } catch (error) {
    ErrorNotify("Error sending notification");
  }
};

export default {
  getRevenue: getRevenue,
  getTotalBookings: getTotalBookings,
  AvgBookingValue: AvgBookingValue,
  fetchLoginCredentials: fetchLoginCredentials,
  groupByPickupBookedBy: groupByPickupBookedBy,
  TopPerformer: TopPerformer,
  months: months,
  IncentiveCalculator: IncentiveCalculator,
  transformData: transformData,
  downloadCSV: downloadCSV,
  getSalesPersonBookings: getSalesPersonBookings,
  fetchStartEndDate: fetchStartEndDate,
  calculateTotalIncentive: calculateTotalIncentive,
  calculateCost: calculateCost,
  rolesPermissions: rolesPermissions,
  formatRouteName: formatRouteName,
  ErrorNotify: ErrorNotify,
  SuccessNotify: SuccessNotify,
  playNotificationSound: playNotificationSound,
  sendNotification: sendNotification,
  foregroundNotification: foregroundNotification,
  fetchAndStoreToken: fetchAndStoreToken,
};
