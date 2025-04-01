import React, { useEffect, useState } from "react";
import utility from "./Utility/utilityFunctions";
import { Avatar } from "@mui/material";
import Nav from "./Nav";
import { format, startOfWeek, addDays, subWeeks } from "date-fns";
import { Timestamp } from "firebase/firestore";
import PickupIncentiveUtility from "./Utility/PickupIncentiveUtility";

function PickupIncentive() {
  const [DateRange, setDateRange] = useState("Last Week"); // Default value set to "This Week"
  const [data, setData] = useState({
    revenue: 0,
    totalBookings: 0,
    avgBookingValue: 0,
    loginCredentials: [],
    groupedData: {},
    topPerformer: "",
    startEnddate: {},
  });

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
  const [startendrange, setstartEnddate] = useState({});
  const [StartDatecustome, setStartDatecustome] = useState({});
  const [endDatecustome, setstartEnddatecustome] = useState({});
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

  function getSalesPersonBookings(person) {
    return data.groupedData[person]?.bookings.length
      ? data.groupedData[person]?.bookings.length
      : 0;
  }

  function calculateTotalKmDriven(person) {
    const bookings = data.groupedData[person]?.bookings || [];
    return bookings.reduce(
      (total, booking) => total + (booking.KmDriven || 0),
      0
    );
  }

  function calculateIncentive(person) {
    return calculateTotalKmDriven(person) * 5;
  }

  useEffect(() => {
    if (DateRange === "Last Week") {
      setstartEnddate({
        start: formattedLastWeekStart,
        end: formattedLastWeekEnd,
      });
    } else if (DateRange === "This Week") {
      setstartEnddate({
        start: formattedStartDate,
        end: formattedEndDate,
      });
    }
    if (DateRange === "Select range") {
      setstartEnddate({
        start: StartDatecustome,
        end: endDatecustome,
      });
    }
  }, [DateRange]); // Update startEnddate when DateRange changes

  useEffect(() => {
    async function getData() {
      try {
        const [
          revenue,
          totalBookings,
          avgBookingValue,
          loginCredentials,
          groupedData,
          topPerformer,
          startEnddate,
        ] = await Promise.all([
          PickupIncentiveUtility.getTotalKGs(DateRange, startendrange),
          PickupIncentiveUtility.getTotalBookings(DateRange, startendrange),
          PickupIncentiveUtility.getKmDriven(DateRange, startendrange),
          PickupIncentiveUtility.fetchLoginCredentials(
            DateRange,
            startendrange
          ),
          PickupIncentiveUtility.groupByPickupBookedBy(
            DateRange,
            startendrange
          ),
          PickupIncentiveUtility.TopPerformer(DateRange, startendrange),
          utility.fetchStartEndDate(DateRange, startendrange),
        ]);
        setData({
          revenue,
          totalBookings,
          avgBookingValue,
          loginCredentials,
          groupedData,
          topPerformer,
          startEnddate,
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }

    if (startendrange.start && startendrange.end) {
      getData(); // Fetch data only when startendrange is ready
    }
  }, [startendrange, DateRange]); // Trigger fetch when startendrange updates

  function FirtLetterCaps(name) {
    return name?.charAt(0).toUpperCase() + name?.slice(1);
  }

  return (
    <div>
      <Nav />
      <div className="flex flex-col gap-10 p-8 bg-gray-50 min-h-screen">
        <div className="text-3xl font-bold text-purple-600 ">
          Pickup Incentive
        </div>
        {/* Filter Options Section */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex flex-col md:flex-row items-center mb-6 gap-6 md:gap-8">
            <h1 className="text-4xl font-semibold text-gray-900 tracking-wide text-center md:text-left">
              Filter Options
            </h1>
            <div className="flex gap-4 md:gap-6 items-center justify-center md:justify-start">
              <h2 className="text-2xl font-semibold text-gray-700">
                {data.startEnddate.startDate}
              </h2>
              <span className="text-2xl font-medium text-gray-500">To</span>
              <h2 className="text-2xl font-semibold text-gray-700">
                {data.startEnddate.endDate}
              </h2>
            </div>
          </div>
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="date-range"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Date Range
                </label>
                <select
                  id="date-range"
                  name="dateRange"
                  className="w-full border border-gray-300 rounded-md p-3 bg-white text-gray-800 focus:ring-purple-500 focus:border-purple-500 transition duration-200"
                  value={DateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  <option value="Select range">Select range</option>
                  <option value="This Week">This Week</option>
                  <option value="Last Week">Last Week</option>
                </select>
              </div>
              {DateRange === "Select range" && (
                <div className="sm:col-span-2 bg-gray-50 p-4 border border-gray-300 rounded-lg shadow-sm">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Custom Date Range
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="start-date"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Start Date
                      </label>
                      <input
                        type="date"
                        id="start-date"
                        onChange={(e) => {
                          const date = new Date(e.target.value);
                          const formattedDate = `${String(
                            date.getDate()
                          ).padStart(2, "0")}-${String(
                            date.getMonth() + 1
                          ).padStart(2, "0")}-${date.getFullYear()}`;
                          setStartDatecustome(
                            convertDateToTimestamp(formattedDate)
                          );
                        }}
                        className="w-full border border-gray-300 rounded-md p-3 focus:ring-purple-500 focus:border-purple-500 text-gray-800 bg-white"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="end-date"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        End Date
                      </label>
                      <input
                        type="date"
                        id="end-date"
                        onChange={(e) => {
                          const date = new Date(e.target.value);
                          const formattedDate = `${String(
                            date.getDate()
                          ).padStart(2, "0")}-${String(
                            date.getMonth() + 1
                          ).padStart(2, "0")}-${date.getFullYear()}`;
                          setstartEnddatecustome(
                            convertDateToTimestamp(formattedDate)
                          );
                        }}
                        className="w-full border border-gray-300 rounded-md p-3 focus:ring-purple-500 focus:border-purple-500 text-gray-800 bg-white"
                      />
                    </div>
                    <button
                      className="bg-purple-500 p-3 rounded-md text-white font-semibold"
                      onClick={() => {
                        setstartEnddate({
                          start: StartDatecustome,
                          end: endDatecustome,
                        });
                      }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Sales Overview Section */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-3xl font-semibold text-gray-800 mb-6">
            Sales Overview
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-purple-50 p-6 rounded-lg shadow-sm text-center">
              <h2 className="text-lg font-medium text-purple-800">
                Pickups Completed
              </h2>
              <p className="text-3xl font-bold text-purple-600">
                {data.totalBookings}
              </p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg shadow-sm text-center">
              <h2 className="text-lg font-medium text-green-800">Total KGs</h2>
              <p className="text-3xl font-bold text-green-600">
                {data.revenue}
                <span className="bg-red-500 text-white text-[10px] rounded-md px-1 py-1 ml-1">
                  Apx
                </span>
              </p>
            </div>
            <div className="bg-blue-50 p-6 rounded-lg shadow-sm text-center">
              <h2 className="text-lg font-medium text-blue-800">
                Total KMs Driven
              </h2>
              <p className="text-3xl font-bold text-blue-600">
                {data.avgBookingValue}
              </p>
            </div>
            <div className="bg-red-50 p-6 rounded-lg shadow-sm text-center">
              <h2 className="text-lg font-medium text-red-800">
                Top Performer
              </h2>
              <p className="text-3xl font-bold text-red-600">
                {FirtLetterCaps(data.topPerformer)}
              </p>
            </div>
          </div>
        </div>
        {/* Sales Team Performance Section */}
        <div>
          <h1 className="text-3xl font-semibold text-gray-800 mb-6">
            Sales Team Performance
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {data.loginCredentials.map((d) => (
              <div
                key={d.name}
                className="bg-white p-6 rounded-lg shadow-lg flex flex-col gap-6 hover:shadow-2xl transition-shadow duration-300"
              >
                {/* Header: Avatar and Info */}
                <div className="flex items-center gap-4">
                  <Avatar
                    alt={FirtLetterCaps(d.name)}
                    src=""
                    className="bg-purple-500 text-white font-bold"
                  />
                  <div>
                    <p className="text-xl font-semibold text-gray-800">
                      {FirtLetterCaps(d.name)}
                    </p>
                    <p className="text-sm text-gray-500">{d.role}</p>
                  </div>
                </div>

                {/* Weekly Bookings */}
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-gray-500">Weekly Bookings</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {getSalesPersonBookings(d.name)}
                  </p>
                </div>

                {/* Download Report Button */}
                <button
                  className="flex items-center justify-center bg-purple-600 py-3 px-4 rounded-lg text-white font-medium gap-2 hover:bg-purple-700 focus:ring focus:ring-purple-300 transition-all"
                  onClick={() =>
                    PickupIncentiveUtility.downloadCSV(
                      d.name,
                      DateRange,
                      startendrange
                    )
                  }
                >
                  <img
                    className="w-5 h-5"
                    src="download-minimalistic.svg"
                    alt="Download icon"
                  />
                  <span>Download Report</span>
                </button>
              </div>
            ))}
          </div>
        </div>
        {/* Weekly Incentive Section */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-4xl font-bold text-gray-800 mb-10 text-center">
            Weekly Incentive (Saturday to Friday)
          </h1>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto bg-white border-collapse border border-gray-300 rounded-lg shadow-md">
              <thead>
                <tr className="bg-purple-200">
                  <th className="px-6 py-4 text-center text-lg font-semibold text-gray-700 border-b border-gray-300">
                    Name
                  </th>
                  <th className="px-6 py-4 text-center text-lg font-semibold text-gray-700 border-b border-gray-300">
                    Pickups
                  </th>
                  <th className="px-6 py-4 text-center text-lg font-semibold text-gray-700 border-b border-gray-300">
                    KMs Driven
                  </th>
                  <th className="px-6 py-4 text-center text-lg font-semibold text-gray-700 border-b border-gray-300">
                    Incentive
                  </th>
                  <th className="px-6 py-4 text-center text-lg font-semibold text-gray-700 border-b border-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.loginCredentials.map((row, index) => (
                  <tr
                    key={index}
                    className={`${
                      index % 2 === 0 ? "bg-gray-50" : "bg-white"
                    } hover:bg-gray-100 transition-colors duration-200`}
                  >
                    <td className="px-6 py-4 text-center text-base text-gray-800 font-medium border-b border-gray-300">
                      {row.name}
                    </td>
                    <td className="px-6 py-4 text-center text-base text-gray-800 font-medium border-b border-gray-300">
                      {String(getSalesPersonBookings(row.name)).padStart(
                        2,
                        "0"
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-base text-gray-800 font-medium border-b border-gray-300">
                      <p>{calculateTotalKmDriven(row.name)}</p>
                    </td>
                    <td className="px-6 py-4 text-center text-base text-gray-800 font-medium border-b border-gray-300">
                      <p>{calculateIncentive(row.name)}</p>
                    </td>
                    <td className="px-6 py-4 text-center text-base text-gray-800 font-medium border-b border-gray-300">
                      <button
                        onClick={() =>
                          PickupIncentiveUtility.downloadCSV(
                            row.name,
                            DateRange,
                            startendrange
                          )
                        }
                        className="text-purple-600 underline hover:text-purple-800"
                      >
                        Download Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PickupIncentive;
