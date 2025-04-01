import { useEffect, useState } from "react";
import Nav from "./Nav";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import collectionName_BaseAwb from "./functions/collectionName";
import utilityFunctions from "./Utility/utilityFunctions";

function Pickups() {
  const [username, setUsername] = useState(null);
  const [role, setRole] = useState("");
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [awbSearchTerm, setAwbSearchTerm] = useState("");
  const [dateSearchTerm, setDateSearchTerm] = useState("");
  const [consignorPhoneSearchTerm, setConsignorPhoneSearchTerm] = useState("");
  const [PickupPersonName, setPickUpPersonName] = useState("");
  const [Location, setLocation] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false); // State to control modal visibility
  const [selectedPickup, setSelectedPickup] = useState(null); // State to hold the selected pickup for modal

  // Fetch user info from localStorage
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("LoginCredentials"));
    setUsername(storedUser?.name);
    setRole(storedUser.role);
  }, []);

  // Modal close handler
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPickup(null); // Reset selected pickup when modal is closed
  };

  const handleMoreIconClick = (pickup) => {
    setSelectedPickup(pickup);
    setIsModalOpen(true); // Open the modal
  };

  const parsePickupDateTime = (dateTimeString) => {
    const [datePart, timePart] = dateTimeString
      .split("&")
      .map((str) => str.trim()); // Split and trim date and time
    const [day, month] = datePart.split("-").map(Number); // Extract day and month as numbers
    const currentYear = new Date().getFullYear(); // Assume the current year
    let [hour, period] = timePart.split(" "); // Split hour and period (AM/PM)
    hour = parseInt(hour, 10); // Convert hour to number
    // Convert hour to 24-hour format if it's PM
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0; // Handle midnight case
    return new Date(currentYear, month - 1, day, hour, 0, 0); // Create Date object
  };
  // Fetch pickup data from Firestore and filter based on the username
  useEffect(() => {
    if (Location == "ALL") {
      if (username) {
        const fetchData = () => {
          try {
            const collectionNames = [
              "pickup",
              "franchise_pondy",
              "franchise_coimbatore",
            ];
            // Create an array of queries for each collection
            const queries = collectionNames.map((collec) =>
              query(collection(db, collec))
            );
            // Use Promise.all to fetch data from all queries
            const unsubscribes = [];
            Promise.all(
              queries.map(
                (q) =>
                  new Promise((resolve) => {
                    const unsubscribe = onSnapshot(q, (snapshot) => {
                      const data = snapshot.docs.map((doc) => ({
                        ...doc.data(),
                        id: doc.id,
                      }));
                      resolve(data);
                    });
                    unsubscribes.push(unsubscribe);
                  })
              )
            )
              .then((results) => {
                const combinedData = results.flat();
                const sortedData = combinedData.sort((a, b) => {
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
                  return (
                    parseDate(b.pickupDatetime) - parseDate(a.pickupDatetime)
                  );
                });
                setPickups(sortedData);
                setLoading(false);
              })
              .catch((error) => {
                utilityFunctions.ErrorNotify(
                  "Unable to retrieve data. Please try again later."
                );
                setLoading(false);
              });
            // Cleanup subscription on unmount
            return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
          } catch (error) {
            utilityFunctions.ErrorNotify(
              "Unable to retrieve data. Please try again later."
            );
            setLoading(false);
          }
        };

        fetchData();
      }
    } else {
      const fetchData = () => {
        try {
          const q = query(
            collection(
              db,
              collectionName_BaseAwb.getCollection(
                Location == "HQ CHENNAI" ? "CHENNAI" : Location
              )
            )
          ); // Fetch all pickups for sales admin
          // Fetch only user's pickups

          const unsubscribe = onSnapshot(q, (snapshot) => {
            const filteredData = snapshot.docs.map((doc) => ({
              ...doc.data(),
              id: doc.id,
            }));
            // Sort data by date and time
            const sortedData = filteredData.sort((a, b) => {
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
            setPickups(sortedData);
            setLoading(false);
          });
          return () => unsubscribe();
        } catch (error) {
          utilityFunctions.ErrorNotify(
            "Unable to retrieve data. Please try again later."
          );
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [username, role, Location]);

  // Filter pickups based on search terms
  const filteredPickups = pickups.filter((pickup) => {
    const awbMatch = String(pickup.awbNumber)
      .toLowerCase()
      .includes(awbSearchTerm.toLowerCase());
    const dateMatch = pickup.pickupDatetime
      .split("&")[0]
      .startsWith(dateSearchTerm); // Check if the date starts with the input
    const consignorPhoneMatch = pickup.consignorphonenumber
      .toLowerCase()
      .includes(consignorPhoneSearchTerm.toLowerCase());
    const PhonesearchItem = pickup.pickUpPersonName
      .toLowerCase()
      .includes(PickupPersonName.toLowerCase());
    return awbMatch && dateMatch && consignorPhoneMatch && PhonesearchItem; // Use AND logic to filter
  });

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600">{error}</div>;
  }
  return (
    <>
      <Nav />
      <div className="container mx-auto p-6 rounded-lg">
        <h1 className="text-3xl font-bold mb-6 text-purple-700">
          {role !== "sales admin" ? (
            <>{Location} SHIPMENTS</>
          ) : (
            "All Booked Pickups"
          )}
        </h1>
        <select
          value={Location}
          onChange={(e) => setLocation(e.target.value)}
          className="border w-fit mb-6 border-gray-300 rounded py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-600"
        >
          <option value="ALL">ALL</option>
          <option value="HQ CHENNAI">HQ CHENNAI</option>
          <option value="PONDY">PONDY</option>
          <option value="COIMBATORE">COIMBATORE</option>
        </select>
        {/* Search Inputs */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search by AWB Number"
            value={awbSearchTerm}
            onChange={(e) => setAwbSearchTerm(e.target.value)}
            className="border border-gray-300 rounded py-2 px-4 w-full mb-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
          <input
            type="date"
            placeholder="Search by Date (YYYY-MM-DD)"
            onChange={(e) => {
              const dateValue = e.target.value; // e.g., "2024-10-07"
              const [year, month, day] = dateValue.split("-");
              const result = `${parseInt(day)}-${parseInt(month)}-${parseInt(
                year
              )}`;
              setDateSearchTerm(result);
            }}
            className="border border-gray-300 rounded py-2 px-4 w-full mb-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
          <input
            type="text"
            placeholder="Search by Consignor Phone Number"
            value={consignorPhoneSearchTerm}
            onChange={(e) => setConsignorPhoneSearchTerm(e.target.value)}
            className="border border-gray-300 rounded py-2 px-4 w-full mb-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
          <input
            type="text"
            placeholder="Search by Pickup Person"
            value={PickupPersonName}
            onChange={(e) => setPickUpPersonName(e.target.value)}
            className="border border-gray-300 rounded py-2 px-4 w-full mb-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
        {/* <h1 className="text-2xl font-bold mb-6 text-purple-700">
          {Location}
        </h1> */}
        {/* Scrollable Table Wrapper */}
        <div className="overflow-auto border scrollbar-hide">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow overflow-hidden">
            <thead className="bg-purple-600 text-white">
              <tr>
                <th className="py-3 px-4 border">AWB Number</th>
                <th className="py-3 px-4 border">Consignor Name</th>
                <th className="py-3 px-4 border">Consignor Phone</th>
                <th className="py-3 px-4 border">Destination</th>
                <th className="py-3 px-4 border">Weight (Apx)</th>
                <th className="py-3 px-4 border">Vendor</th>
                <th className="py-3 px-4 border">Pickup Area</th>
                <th className="py-3 px-4 border">Status</th>
                <th className="py-3 px-4 border">PickUp Status</th>
                <th className="py-3 px-4  border">Pickup Date & Time</th>
                <th className="py-3 px-4 border"> Pickup Booked by</th>
                <th className="py-3 px-4 border">PickUp Person</th>
                <th className="py-3 px-4 border">PickUp Person</th>
              </tr>
            </thead>
            <tbody>
              {filteredPickups.length > 0 ? (
                filteredPickups.map((pickup) => (
                  <tr key={pickup.id}>
                    <td className="py-10 px-4 border">{pickup.awbNumber}</td>
                    <td className="py-10 px-4 border">
                      {pickup.consignorname}
                    </td>
                    <td className="py-10 px-4 border">
                      {pickup.consignorphonenumber}
                    </td>
                    <td className="py-10 px-4 border">{pickup.destination}</td>
                    <td className="py-10 px-4 border">{pickup.weightapx}</td>
                    <td className="py-10 px-4 border">{pickup.vendorName}</td>
                    <td className="py-10 px-4 border">{pickup.pickuparea}</td>
                    <td className="py-10 px-4 border text-nowrap">
                      {pickup.status}
                    </td>
                    <td className="py-10 px-4 border text-nowrap">
                      {pickup.pickUpPersonNameStatus == "" ||
                      pickup.pickUpPersonNameStatus == null
                        ? "NOT COMPLETED"
                        : pickup.pickUpPersonNameStatus}
                    </td>
                    <td className="py-10 px-4 border text-nowrap">
                      {pickup.pickupDatetime}
                    </td>
                    <td className="py-10 px-4 border">
                      {pickup.pickupBookedBy}
                    </td>
                    <td className="py-10 px-4 border flex flex-col items-center">
                      {pickup.pickUpPersonName}
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
                  <td
                    colSpan="10"
                    className="text-center py-4 font-semibold text-gray-600"
                  >
                    No pickups found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {isModalOpen && selectedPickup && (
          <div className="fixed inset-0 w-full bg-black bg-opacity-50 flex justify-center items-center z-50 overflow-auto">
            <div className="bg-white relative z-50 p-8 rounded-lg w-full max-w-lg shadow-lg max-h-screen overflow-y-auto">
              <h2 className="text-3xl font-semibold mb-6 text-purple-700 text-center">
                Pickup Details
              </h2>
              <div className="space-y-4 text-gray-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-gray-800">
                  <p>
                    <span className="font-semibold text-purple-700">
                      AWB Number:
                    </span>{" "}
                    {selectedPickup.awbNumber || "NA"}
                  </p>
                  <p>
                    <span className="font-semibold text-purple-700">
                      Destination:
                    </span>{" "}
                    {selectedPickup.destination || "NA"}
                  </p>
                  <div className="flex flex-col gap-4">
                    <p>
                      <span className="font-semibold text-purple-700">
                        Consignor Name:
                      </span>{" "}
                      {selectedPickup.consignorname || "NA"}
                    </p>
                    <p>
                      <span className="font-semibold text-purple-700">
                        Consignor Phone:
                      </span>{" "}
                      {selectedPickup.consignorphonenumber || "NA"}
                    </p>
                    <p>
                      <span className="font-semibold text-purple-700">
                        Consignor Address:
                      </span>{" "}
                      {selectedPickup.consignorlocation || "NA"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <p>
                      <span className="font-semibold text-purple-700">
                        Consignee Name:
                      </span>{" "}
                      {selectedPickup.consigneename || "NA"}
                    </p>
                    <p>
                      <span className="font-semibold text-purple-700">
                        Consignee Phone:
                      </span>{" "}
                      {selectedPickup.consigneephonenumber || "NA"}
                    </p>
                    <p>
                      <span className="font-semibold text-purple-700">
                        Consignee Address:
                      </span>{" "}
                      {selectedPickup.consigneelocation || "NA"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <p>
                      <span className="font-semibold text-purple-700">
                        Weight (Apx):
                      </span>{" "}
                      {selectedPickup.weightapx || "NA"}
                    </p>
                    <p>
                      <span className="font-semibold text-purple-700">
                        Post Pickup Weight:
                      </span>{" "}
                      {selectedPickup.postPickupWeight || "NA"}
                    </p>
                    <p>
                      <span className="font-semibold text-purple-700">
                        Final Weight:
                      </span>{" "}
                      {selectedPickup.actualWeight + " " + "KG" || "NA"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <p>
                      <span className="font-semibold text-purple-700">
                        Service:
                      </span>{" "}
                      {selectedPickup.service || "NA"}
                    </p>
                    <p>
                      <span className="font-semibold text-purple-700">
                        Vendor:
                      </span>{" "}
                      {selectedPickup.vendorName || "NA"}
                    </p>
                    <p>
                      <span className="font-semibold text-purple-700">
                        Pickup Area:
                      </span>{" "}
                      {selectedPickup.pickuparea || "NA"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-6">
                    {/* Status Section */}
                    <div className="flex items-center">
                      <span className="font-semibold text-purple-700 text-lg">
                        Status:
                      </span>
                      <span
                        className={`font-medium px-3 py-1 ml-1 rounded-full text-[13px]  text-nowrap ${
                          selectedPickup.status === "SHIPMENT CONNECTED"
                            ? "bg-green-200 text-green-800"
                            : "bg-red-200 text-red-800"
                        }`}
                      >
                        {selectedPickup.status || "NA"}
                      </span>
                    </div>

                    {/* Logistics Cost Section */}
                  </div>
                  <div
                    className={`p-4 rounded-lg shadow-inner border ${
                      ["PAYMENT DONE", "SHIPMENT CONNECTED"].includes(
                        selectedPickup.status
                      )
                        ? "bg-green-50 border-green-300 text-green-800"
                        : "bg-gray-50 border-gray-300 text-gray-800"
                    }`}
                  >
                    <span className="font-semibold text-purple-700 text-lg">
                      Logistics Cost:
                    </span>{" "}
                    <span className="text-lg font-medium">
                      {selectedPickup.logisticCost || "NA"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-4">
                    <p>
                      <span className="font-semibold text-purple-700">
                        Pickup Booked by:
                      </span>{" "}
                      {selectedPickup.pickupBookedBy || "NA"}
                    </p>
                    <p>
                      <span className="font-semibold text-purple-700">
                        PickUp Person:
                      </span>{" "}
                      {selectedPickup.pickUpPersonName || "NA"}
                    </p>
                  </div>
                  <p>
                    <span className="font-semibold text-purple-700">
                      Pickup Date & Time:
                    </span>{" "}
                    {selectedPickup.pickupDatetime || "NA"}
                  </p>

                  <p className="flex items-center gap-2 bg-gradient-to-r from-purple-100 to-purple-200 p-3 rounded-lg shadow-lg border-l-4 border-purple-700">
                    <span className="font-bold text-purple-900">Source:</span>
                    <span className="text-gray-700">
                      {selectedPickup.Source || "NA"}
                    </span>
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  KYC Images
                </h3>
                {selectedPickup.KycImage ? (
                  <div className="grid grid-cols-1 gap-4 bg-white p-4 rounded-lg shadow-md">
                    <a
                      href={selectedPickup.KycImage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <button className="px-4 py-2 text-white bg-purple-600 rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
                        View KYC Image
                      </button>
                    </a>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 bg-gray-50 p-4 rounded-lg shadow-md">
                    <p className="text-gray-600">No Image Available</p>
                  </div>
                )}
              </div>
              {selectedPickup.PRODUCTSIMAGE?.length > 0 ? (
                <div className="mt-6 relative ">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Products Images
                  </h3>
                  <p className="absolute right-3 top-1">
                    <span className="font-semibold text-purple-700">
                      Pickup Completed:
                    </span>{" "}
                    {selectedPickup.pickupCompletedDatatime || "NA"}
                  </p>
                  <div className="grid grid-cols-1 gap-4">
                    {selectedPickup.PRODUCTSIMAGE.map((d, index) => (
                      <a href={d} key={index} target="_blank" className="w-fit">
                        <img
                          key={index}
                          src={d}
                          alt={`Form Image ${index + 1}`}
                          className="w-48 rounded-2xl object-scale-down h-48"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-6 pb-3 border-b-2 border-purple-700">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Products Images
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <>No Images</>
                  </div>
                </div>
              )}
              {selectedPickup.PACKAGEWEIGHTIMAGES?.length > 0 ? (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Package Weight Images
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {selectedPickup.PACKAGEWEIGHTIMAGES.map((d, index) => (
                      <a href={d} key={index} target="_blank" className="w-fit">
                        <img
                          key={index}
                          src={d}
                          alt={`Form Image ${index + 1}`}
                          className="w-48 rounded-2xl object-scale-down h-48"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-6 pb-3 border-b-2 border-purple-700">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Package Weight Images
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <>No Images</>
                  </div>
                </div>
              )}

              {selectedPickup.FORMIMAGES?.length > 0 ? (
                <div className="mt-6 ">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Form Images
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {selectedPickup.FORMIMAGES.map((d, index) => (
                      <a href={d} key={index} target="_blank" className="w-fit">
                        <img
                          key={index}
                          src={d}
                          alt={`Form Image ${index + 1}`}
                          className="w-48 rounded-2xl object-scale-down h-48"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-6 pb-3 border-b-2 border-purple-700 ">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Form Images
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <>No Images</>
                  </div>
                </div>
              )}
              <div className="mt-6 ">
                {selectedPickup.PickupPersonImageURL ? (
                  <div className="grid grid-cols-1 gap-4 pb-3 border-b-2 border-purple-700">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      Pickup Person Image
                    </h3>
                    <a
                      href={selectedPickup.PickupPersonImageURL}
                      target="_blank"
                      className="w-fit"
                    >
                      <img
                        src={selectedPickup.PickupPersonImageURL}
                        className="w-48 rounded-2xl object-scale-down h-48"
                      />
                    </a>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 pb-3 border-b-2 border-purple-700">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      Pickup Person Image
                    </h3>
                    <p>No Image</p>
                  </div>
                )}
              </div>
              {typeof selectedPickup.finalWeightImage === "string" ? (
                <div className="mt-6  pb-3 border-b-2 border-purple-700">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Final Weight Image{" "}
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <a
                      href={selectedPickup.finalWeightImage}
                      target="_blank"
                      className="w-fit"
                    >
                      <img
                        src={selectedPickup.finalWeightImage}
                        alt="Final Weight Image"
                        className="w-48 rounded-2xl object-scale-down h-48"
                      />
                    </a>
                  </div>
                </div>
              ) : Array.isArray(selectedPickup.finalWeightImage) &&
                selectedPickup.finalWeightImage.length > 0 ? (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Final Weight Image{" "}
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {selectedPickup.finalWeightImage.map((d, index) => (
                      <a href={d} key={index} target="_blank" className="w-fit">
                        <img
                          src={d}
                          alt={`Form Image ${index + 1}`}
                          className="w-48 rounded-2xl object-scale-down h-48"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-6 pb-3 border-b-2 border-purple-700">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Final Weight Image{" "}
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <>No Images</>
                  </div>
                </div>
              )}

              <div className="mt-6">
                {selectedPickup.paymentProof ? (
                  <div className="relative grid grid-cols-1 gap-4 pb-3 border-b-2 border-purple-700">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      Payment Proof
                    </h3>
                    <p className="w-2/4 absolute right-3 top-1">
                      <span className="font-semibold text-purple-700">
                        Payment Confirmed:
                      </span>{" "}
                      {selectedPickup.PaymentComfirmedDate || "NA"}
                    </p>
                    <a
                      href={selectedPickup.paymentProof}
                      target="_blank"
                      className="w-fit"
                    >
                      <img
                        src={selectedPickup.paymentProof}
                        className="w-48 rounded-2xl object-scale-down h-48"
                      />
                    </a>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 pb-3 border-b-2 border-purple-700">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      Payment Proof{" "}
                    </h3>
                    <p>No Image</p>
                  </div>
                )}
              </div>

              <div className="mt-6">
                {selectedPickup.AWbNumberImage ? (
                  <div className="relative grid grid-cols-1 gap-4 pb-3 border-b-2 border-purple-700">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      AWb Number Image
                    </h3>
                    <p className="w-1/2 absolute right-3 top-1">
                      <span className="font-semibold text-purple-700">
                        Package Connected:
                      </span>
                      {selectedPickup.packageConnectedDataTime || "NA"}
                    </p>
                    <a
                      href={selectedPickup.AWbNumberImage}
                      target="_blank"
                      className="w-fit"
                    >
                      <img
                        src={selectedPickup.AWbNumberImage}
                        className="w-48 rounded-2xl object-scale-down h-48"
                      />
                    </a>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 pb-3 border-b-2 border-purple-700">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      AWb Number Image{" "}
                    </h3>
                    <p>No Image</p>
                  </div>
                )}
              </div>

              <button
                onClick={closeModal}
                className="mt-6 w-fit absolute top-0 right-0 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                Close
              </button>
              <button
                onClick={closeModal}
                className="mt-6 w-full top-0 right-0 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Pickups;