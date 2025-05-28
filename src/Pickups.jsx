import { useEffect, useState } from "react";
import Nav from "./Nav";
import {
  collection,
  query,
  onSnapshot,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import collectionName_BaseAwb from "./functions/collectionName";
import utilityFunctions from "./Utility/utilityFunctions";
import ShipmentDetails from "./ShipmentDetails";
import EditShipmentModal from "./EditShipmentModal";
import { FiEdit } from "react-icons/fi";

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
  const [isModalOpen, setIsModalOpen] = useState(false); // State to control modal visibility
  const [selectedPickup, setSelectedPickup] = useState(null); // State to hold the selected pickup for modal
  const [loadingEdit, setLoadingEdit] = useState(false);
  // Fetch user info from localStorage
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("LoginCredentials"));
    setUsername(storedUser?.name);
    setRole(storedUser.role);
  }, []);

  const handleMoreIconClick = (pickup) => {
    setSelectedPickup(pickup);
    setIsModalOpen(true); // Open the modal
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPickup(null); // Reset selected pickup when modal is closed
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
    if (username) {
      const fetchData = () => {
        try {
          const q =
            role === "sales admin" || role === "Manager"
              ? query(
                  collection(
                    db,
                    collectionName_BaseAwb.getCollection(
                      JSON.parse(localStorage.getItem("LoginCredentials"))
                        .Location
                    )
                  )
                ) // Fetch all pickups for sales admin
              : query(
                  collection(
                    db,
                    collectionName_BaseAwb.getCollection(
                      JSON.parse(localStorage.getItem("LoginCredentials"))
                        .Location
                    )
                  ),
                  where("pickupBookedBy", "==", username)
                ); // Fetch only user's pickups

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
          // Cleanup subscription on unmount
          return () => unsubscribe();
        } catch (error) {
          utilityFunctions.ErrorNotify("Data fetch failed. Please try again.");
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [username, role]);

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

  const [editPickup, setEditPickup] = useState(null);
  const [isModalOpenEdit, setModalOpenEdit] = useState(false);
  const [Editedvalue, setEditedvalue] = useState(null);

  const handleEditClick = (pickup) => {
    setEditPickup({ ...pickup });
    setModalOpenEdit(true);
  };

  const handleSave = async (value) => {
    setLoadingEdit(true);
    try {
      const q = query(
        collection(db, "pickuptestdata"),
        where("awbNumber", "==", value.awbNumber)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, {
          vendorName: value.vendorName,
          consignorname: value.consignorname,
          consignorphonenumber: value.consignorphonenumber,
          consignorlocation: value.consignorlocation,
          service: value.service,
        });
        console.log("Document successfully updated!");
      } else {
        console.error("No document found with the given AWB number.");
      }
    } catch (error) {
      console.error("Error updating document:", error);
    } finally {
      setLoadingEdit(false);
      setModalOpenEdit(false);
    }
  };

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
          {role == "sales admin" || role == "Manager" ? (
            "All Shipments"
          ) : (
            <>Pickups Booked by {username}</>
          )}
        </h1>
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
              const result = `${parseInt(day)}-${parseInt(month)}`;
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
        {/* Scrollable Table Wrapper */}
        <div className="overflow-auto border scrollbar-hide">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow overflow-hidden">
            <thead className="bg-purple-600 text-white">
              <tr>
                <th className="py-3 px-4 border">AWB Number</th>
                <th className="py-3 px-4 border">Status</th>
                <th className="py-3 px-4 border">Consignor Name</th>
                <th className="py-3 px-4 border">Consignor Phone</th>
                <th className="py-3 px-4 border">Destination</th>
                <th className="py-3 px-4 border">Weight (Apx)</th>
                <th className="py-3 px-4 border">Vendor</th>
                <th className="py-3 px-4 border">Pickup Area</th>
                <th className="py-3 px-4  border">Pickup Date & Time</th>
                <th className="py-3 px-4 border"> Pickup Booked by</th>
                <th className="py-3 px-4 border">PickUp Person</th>
                <th className="py-3 px-4 border">Edit Shipment</th>
              </tr>
            </thead>
            <tbody>
              {filteredPickups.length > 0 ? (
                filteredPickups.map((pickup) => (
                  <tr key={pickup.id}>
                    <td className="py-10 px-4 border">{pickup.awbNumber}</td>
                    <td className="py-10 px-4 border text-nowrap">
                      {pickup.status}
                    </td>
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
                      {pickup.pickupDatetime}
                    </td>
                    <td className="py-10 px-4 border">
                      {pickup.pickupBookedBy}
                    </td>
                    <td className="py-6 px-4 border text-center align-middle">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">
                          {pickup.pickUpPersonName || "—"}
                        </span>
                        <button
                          onClick={() => handleMoreIconClick(pickup)}
                          className="p-2 rounded-full hover:bg-purple-100 transition duration-150 ease-in-out group"
                          title="More Actions"
                        >
                          <img
                            src="more-icon.svg"
                            alt="More"
                            className="w-8 h-8 group-hover:scale-110 transition-transform"
                          />
                        </button>
                      </div>
                    </td>
                    <td className="p-4 border text-center align-middle">
                      <button
                        onClick={() => handleEditClick(pickup)}
                        className="text-purple-600 hover:underline text-[16px]  font-medium"
                      >
                        Edit
                      </button>
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
          <ShipmentDetails
            selectedPickup={selectedPickup}
            closeModal={closeModal}
          />
        )}
        {isModalOpenEdit && (
          <EditShipmentModal
            pickup={editPickup}
            onChange={setEditedvalue}
            onClose={() => setModalOpenEdit(false)}
            onSave={handleSave}
            loadingEdit={loadingEdit}
          />
        )}
      </div>
    </>
  );
}

export default Pickups;
