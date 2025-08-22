import { collection, getDocs, query, where } from "firebase/firestore";
import DB from "../DB/DB";
import { db } from "../firebase";

function extractDate(dateString) {
  const datePart = dateString.split(" ")[0];
  return datePart;
}

function convertDateToTimestamp(dateString) {
  try {
    const result = extractDate(dateString);
    const [day, month, year] = result.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const milliseconds = date.getTime();
    const seconds = Math.floor(milliseconds / 1000);
    const nanoseconds = (milliseconds % 1000) * 1e6;

    return {
      seconds,
      nanoseconds,
    };
  } catch (error) {
    // console.log(error);
  }
}

async function fetchData(DateRange, startendrange, user, selectedBookedBy) {
  try {
    let queryRef = collection(db, DB.db_collection);
    if (DateRange == "Select range") {
      if (user?.role == "Manager" || user?.role == "sales admin") {
        if (selectedBookedBy == "All") {
          queryRef = query(
            collection(db, DB.db_collection),
            where("status", "in", ["PAYMENT DONE", "SHIPMENT CONNECTED"])
          );
        } else {
          queryRef = query(
            collection(db, DB.db_collection),
            where("status", "in", ["PAYMENT DONE", "SHIPMENT CONNECTED"]),
            where("pickupBookedBy", "==", selectedBookedBy)
          );
        }
      } else {
        queryRef = query(
          collection(db, DB.db_collection),
          where("status", "in", ["PAYMENT DONE", "SHIPMENT CONNECTED"]),
          where("pickupBookedBy", "==", user?.name)
        );
      }
    }

    const querySnapshot = await getDocs(queryRef);
    const fetchedData = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return { ...data }; // Attach the parsed data
    });

    // Update the fetched data by converting PaymentComfirmedDate to Timestamp
    const updatedData = fetchedData.map((item) => ({
      ...item,
      PaymentComfirmedDate: convertDateToTimestamp(item.PaymentComfirmedDate),
    }));
    // Filter based on the selected DateRange
    const filteredData = updatedData.filter((item) =>
      DateRange === "This Week"
        ? item.PaymentComfirmedDate?.seconds >= startendrange?.start?.seconds &&
          item.PaymentComfirmedDate?.seconds <= startendrange?.end?.seconds
        : item.PaymentComfirmedDate?.seconds >= startendrange?.start?.seconds &&
          item.PaymentComfirmedDate?.seconds <= startendrange?.end?.seconds
    );
    console.log("filteredData", DateRange, filteredData);
    return filteredData;
  } catch (error) {
    console.error("Error fetching pickup data:", error);
    return [];
  }
}

var shipmentCount = [{ currentMonthSales: 0, previousMonthSales: 0 }];

async function getRevenue(
  DateRange,
  startendrange,
  user,
  period,
  selectedBookedBy
) {
  var Revenue = 0;

  await fetchData(DateRange, startendrange, user, selectedBookedBy).then(
    (d) => {
      d?.map((value) => {
        Revenue += value.logisticCost;
      });
      shipmentCount[period] = d.length;
    }
  );
  return Revenue.toFixed(2);
}

async function growth(user, selectedBookedBy) {
  const today = new Date();

  // Current month date range (start of month to today)
  const currentStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const currentEndDate = today; // Today's date

  // Previous month date range (start of last month to the corresponding day of last month)
  const previousStartDate = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    1
  );

  // Calculate the corresponding day in the previous month
  const previousEndDate = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    today.getDate()
  );

  // If the calculated previousEndDate's month is not the previous month, set it to the last day of the previous month.
  if (
    previousEndDate.getMonth() !==
    (today.getMonth() === 0 ? 11 : today.getMonth() - 1)
  ) {
    previousEndDate.setDate(0); // This sets it to the last day of the *previous* month
  }

  const formatDate = (date) =>
    `${String(date.getDate()).padStart(2, "0")}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${date.getFullYear()}`;

  const currentMonthSales = await getRevenue(
    "Select range",
    {
      start: convertDateToTimestamp(formatDate(currentStartDate)),
      end: convertDateToTimestamp(formatDate(currentEndDate)),
    },
    user,
    "currentMonthSales",
    selectedBookedBy
  );

  const previousMonthSales = await getRevenue(
    "Select range",
    {
      start: convertDateToTimestamp(formatDate(previousStartDate)),
      end: convertDateToTimestamp(formatDate(previousEndDate)),
    },
    user,
    "previousMonthSales",
    selectedBookedBy
  );

  const growthPercentage =
    previousMonthSales > 0.0
      ? // normal % change
        (
          ((currentMonthSales - previousMonthSales) / previousMonthSales) *
          100
        ).toFixed(1)
      : // if no base but some new sales, count it as “full” growth
      currentMonthSales > 0
      ? "100.0"
      : "0.0";
  return {
    growthPercentage: growthPercentage,
    currentMonthSales: currentMonthSales,
    previousMonthSales: previousMonthSales,
    shipmentCount: shipmentCount,
  };
}
export default {
  growth: growth,
};
