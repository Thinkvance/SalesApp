import React, { useEffect, useState } from "react";
import Nav from "./Nav";
// import "./Myshipments.css";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import axios from "axios";
import Lottie from "lottie-react";
import loadingAnimation from "../public/loading_sharebtn.json"; // adjust the path as needed
import DB from "./DB/DB";
import ShipmentDetails from "./ShipmentDetails";
import utilityFunctions from "./Utility/utilityFunctions";

export default function Myshipments() {
  const [selectedRecipient, setSelectedRecipient] = useState({});
  const [username, setUsername] = useState(null);
  const [role, setRole] = useState("");
  const [data, setdata] = useState([]);
  const [loading, setLoading] = useState(false);
  const [awbSearchTerm, setAwbSearchTerm] = useState("");
  const [consignorPhoneSearchTerm, setConsignorPhoneSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false); // State to control modal visibility
  const [selectedPickup, setSelectedPickup] = useState(null); // State to hold the selected pickup for modal

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
      if (selectedRecipient[awb] == "consignee") {
        return;
      }

      const estimatedDelivery = utilityFunctions.getEstimatedDate(
        packageConnectedDataTime,
        mode
      );

      const data = {
        messages: [
          {
            content: {
              language: "en",
              templateData: {
                body: {
                  placeholders: [
                    name, // {{1}} - Name
                    currentStatus,
                    destination, // {{4}} - Destination
                    estimatedDelivery, // {{5}} - Estimated Delivery
                  ],
                },
                buttons: [
                  {
                    type: "URL",
                    parameter: String(awb), // Will be appended to URL in template
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

      await axios
        .post("https://public.doubletick.io/whatsapp/message/template", data, {
          headers: {
            Authorization: "key_z6hIuLo8GC",
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        })
        .then((response) => {
          console.log("Message sent:", response.data);
        })
        .catch((error) => {
          console.error(
            "Error sending message:",
            error.response?.data || error.message
          );
        });
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  }

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("LoginCredentials"));
    setUsername(storedUser?.name);
    setRole(storedUser.role);
  }, []);

  useEffect(() => {
    let q;
    if (role === "Manager" || role === "sales admin") {
      // Get all data from "pickup"
      q = query(
        collection(db, DB.db_collection),
        where("currentStatus", "!=", "DELIVERED")
      );
    } else {
      q = query(
        collection(db, DB.db_collection),
        where("pickupBookedBy", "==", username),
        where("currentStatus", "!=", "DELIVERED")
      );
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const pickupData = [];
      querySnapshot.forEach((doc) => {
        pickupData.push({ id: doc.id, ...doc.data() });
      });

      const sortedData = pickupData.sort((a, b) => {
        const parseDate = (datetime) => {
          const [datePart, timePart] = datetime.split(" &");
          const [day, month, year] = datePart.split("-").map(Number);

          const [hour, period] = timePart.split(" ");
          const hour24 =
            period === "PM" && hour !== "12"
              ? Number(hour) + 12
              : Number(hour === "12" && period === "AM" ? 0 : hour);
          return new Date(year, month - 1, day, hour24).getTime();
        };
        return parseDate(b.pickupDatetime) - parseDate(a.pickupDatetime);
      });
      setdata(sortedData);
    });

    // Cleanup on unmount
    return () => unsubscribe();
  }, [role, username]);

  const filteredPickups = data.filter((pickup) => {
    const awbMatch = String(pickup.awbNumber)
      .toLowerCase()
      .includes(awbSearchTerm.toLowerCase());
    const consignorPhoneMatch = pickup.consignorphonenumber
      .toLowerCase()
      .includes(consignorPhoneSearchTerm.toLowerCase());
    return awbMatch && consignorPhoneMatch; // Use AND logic to filter
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPickup(null); // Reset selected pickup when modal is closed
  };
  const handleMoreIconClick = (pickup) => {
    setSelectedPickup(pickup);
    setIsModalOpen(true); // Open the modal
  };

  return (
    <>
      <Nav />
      <div className="container mx-auto p-6">
        <h2 className="text-3xl font-bold text-purple-700 mb-6">
          My Shipments
        </h2>
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search by AWB Number"
            value={awbSearchTerm}
            onChange={(e) => setAwbSearchTerm(e.target.value)}
            className="border border-gray-300 rounded py-2 px-4 w-full mb-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
          <input
            type="text"
            placeholder="Search by Consignor Phone Number"
            value={consignorPhoneSearchTerm}
            onChange={(e) => setConsignorPhoneSearchTerm(e.target.value)}
            className="border border-gray-300 rounded py-2 px-4 w-full mb-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
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
                  "Track",
                  "Details",
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
              {filteredPickups.map((item, i) => (
                <tr
                  key={item.awbNumber}
                  className="border-b hover:bg-gray-50 transition"
                >
                  <td className="px-4  py-2">{item.awbNumber}</td>
                  <td className="px-4 border py-2">{item.consignorname}</td>
                  <td className="px-4 border py-2">
                    {item.consignorphonenumber}
                  </td>
                  <td className="px-4 border py-2">
                    {item.consigneephonenumber}
                  </td>
                  {/* <td className="px-4 py-2">{item.destination}</td> */}
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
                            selectedRecipient[item.awbNumber] === "consignor"
                              ? item.consignorphonenumber
                              : item.consigneephonenumber;

                          const recipientname =
                            selectedRecipient[item.awbNumber] === "consignor"
                              ? item.consignorname
                              : item.consigneename;

                          try {
                            await Sharetrackinglink({
                              name: recipientname,
                              awb: item.awbNumber,
                              mode: item.service,
                              destination: item.destination,
                              phone: recipientPhone,
                              currentStatus: item.currentStatus.toLowerCase(),
                              packageConnectedDataTime:
                                item.packageConnectedDataTime,
                            });
                          } catch (err) {
                            console.error("Error sharing tracking link:", err);
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
                  <td className="text-[12px] px-4 py-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                    {item.currentStatus}
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
                      onClick={() => handleMoreIconClick(item)} // On click, show details in modal
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
