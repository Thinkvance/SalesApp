import { useEffect, useState } from "react";
import Nav from "./Nav";
import {
  collection,
  query,
  onSnapshot,
  where,
  getDocs,
  updateDoc,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import collectionName_BaseAwb from "./functions/collectionName";
import utilityFunctions from "./Utility/utilityFunctions";
import ShipmentDetails from "./ShipmentDetails";
import EditShipmentModal from "./EditShipmentModal";
import DB from "./DB/DB";
import formatFirestoreTimestamp from "./Utility/formatFirestoreTimestamp.js";
import oneMonthAgo from "./Utility/oneMonthAgo.js";
function Pickups() {
  const [username, setUsername] = useState(null);
  const [role, setRole] = useState("");
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [awbSearchTerm, setAwbSearchTerm] = useState("");
  const [dateSearchTerm, setDateSearchTerm] = useState(null);
  const [consignorPhoneSearchTerm, setConsignorPhoneSearchTerm] = useState("");
  const [PickupPersonName, setPickUpPersonName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [loadingEdit, setLoadingEdit] = useState(false);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("LoginCredentials"));
    setUsername(storedUser?.name);
    setRole(storedUser.role);
  }, []);

  const handleMoreIconClick = (pickup) => {
    setSelectedPickup(pickup);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPickup(null);
  };

  useEffect(() => {
    if (username) {
      const fetchData = () => {
        try {
          const location = JSON.parse(
            localStorage.getItem("LoginCredentials")
          ).Location;
          const baseCollection = collection(
            db,
            collectionName_BaseAwb.getCollection(location)
          );

          let q;
          if (dateSearchTerm) {
            const startDate = new Date(dateSearchTerm);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(dateSearchTerm);
            endDate.setHours(23, 59, 59, 999);

            const startTimestamp = Timestamp.fromDate(startDate);
            const endTimestamp = Timestamp.fromDate(endDate);

            q =
              role === "sales admin" || role === "OPS Head"
                ? query(
                    baseCollection,
                    where("pickupDatetime", ">=", startTimestamp),
                    where("pickupDatetime", "<=", endTimestamp),
                    where(
                      "pickupDatetime",
                      ">=",
                      Timestamp.fromDate(oneMonthAgo),
                      orderBy("pickupDatetime", "desc")
                    )
                  )
                : query(
                    baseCollection,
                    where("pickupBookedBy", "==", username),
                    where("pickupDatetime", ">=", startTimestamp),
                    where("pickupDatetime", "<=", endTimestamp),
                    where(
                      "pickupDatetime",
                      ">=",
                      Timestamp.fromDate(oneMonthAgo)
                    ),
                    orderBy("pickupDatetime", "desc")
                  );
          } else {
            q =
              role === "sales admin" || role === "OPS Head"
                ? query(baseCollection)
                : query(
                    baseCollection,
                    where("pickupBookedBy", "==", username),
                    where(
                      "pickupDatetime",
                      ">=",
                      Timestamp.fromDate(oneMonthAgo)
                    ),
                    orderBy("pickupDatetime", "desc")
                  );
          }
          const unsubscribe = onSnapshot(q, (snapshot) => {
            const filteredData = snapshot.docs.map((doc) => ({
              ...doc.data(),
              id: doc.id,
            }));
            console.log("filteredData", filteredData);
            setPickups(filteredData);
          });

          return () => unsubscribe();
        } catch (error) {
          console.log("error", error);
          utilityFunctions.ErrorNotify("Data fetch failed. Please try again.");
        }
      };
      fetchData();
    }
  }, [username, role, dateSearchTerm]);

  const filteredPickups = pickups.filter((pickup) => {
    const awbMatch = String(pickup.awbNumber)
      .toLowerCase()
      .includes(awbSearchTerm.toLowerCase());
    const consignorPhoneMatch = pickup.consignorphonenumber
      .toLowerCase()
      .includes(consignorPhoneSearchTerm.toLowerCase());
    const personMatch = pickup.pickUpPersonName
      .toLowerCase()
      .includes(PickupPersonName.toLowerCase());
    return awbMatch && consignorPhoneMatch && personMatch;
  });

  function formatString(input) {
    return input.trim().replace(/\s+/g, " ");
  }

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
        collection(db, DB.db_collection),
        where("awbNumber", "==", value.awbNumber)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, {
          vendorName: value.vendorName,
          consignorname: value.consignorname,
          service: value.service,
          actualWeight: formatString(value.actualWeight),
          vendorAwbnumber: value.vendorAwbnumber,
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

  if (loading) return <div className="text-center">Loading...</div>;
  if (error) return <div className="text-center text-red-600">{error}</div>;

  return (
    <>
      <Nav />
      <div className="container mx-auto p-6 rounded-lg">
        <h1 className="text-3xl font-bold mb-6 text-purple-700">
          {role === "sales admin" || role === "Manager"
            ? "All Shipments"
            : `Pickups Booked by ${username}`}
        </h1>

        <div className="mb-6 flex flex-wrap gap-6 sm:gap-10 ">
          <input
            type="text"
            placeholder="Search by AWB Number"
            value={awbSearchTerm}
            onChange={(e) => setAwbSearchTerm(e.target.value)}
            className="border  border-gray-300 rounded py-2 px-4 w-fit mb-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
          <input
            type="date"
            placeholder="Search by Date (YYYY-MM-DD)"
            onChange={(e) => {
              const dateStr = e.target.value;
              if (!dateStr) {
                setDateSearchTerm(null);
                return;
              }
              const selectedDate = new Date(dateStr);
              selectedDate.setHours(0, 0, 0, 0);
              setDateSearchTerm(selectedDate);
            }}
            className="border border-gray-300 rounded py-2 px-4 w-fit mb-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
          <input
            type="text"
            placeholder="Search by Consignor Phone Number"
            value={consignorPhoneSearchTerm}
            onChange={(e) => setConsignorPhoneSearchTerm(e.target.value)}
            className="border border-gray-300 rounded py-2 px-4 w-[290px] mb-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
          <input
            type="text"
            placeholder="Search by Pickup Person"
            value={PickupPersonName}
            onChange={(e) => setPickUpPersonName(e.target.value)}
            className="border border-gray-300 rounded py-2 px-4 w-fit mb-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
        <div className="overflow-auto border scrollbar-hide">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow overflow-hidden">
            <thead className="bg-purple-600 text-white">
              <tr className="text-nowrap">
                <th className="py-3 px-4 border">AWB Number</th>
                <th className="py-3 px-4 border">Status</th>
                <th className="py-3 px-4 border">Consignor Name</th>
                <th className="py-3 px-4 border">Consignor Phone</th>
                <th className="py-3 px-4 border">Destination</th>
                <th className="py-3 px-4 border">Weight (Apx)</th>
                <th className="py-3 px-4 border">Vendor</th>
                <th className="py-3 px-4 border">Pickup Area</th>
                <th className="py-3 px-4 border">Pickup Date & Time</th>
                <th className="py-3 px-4 border">Pickup Booked by</th>
                <th className="py-3 px-4 border">Pickup Person</th>
                <th className="py-3 px-4 border">Edit Shipment</th>
              </tr>
            </thead>
            <tbody>
              {filteredPickups.length > 0 ? (
                filteredPickups.map((pickup) => (
                  <tr key={pickup.id} className="text-nowrap">
                    <td className="py-10 px-4 border">{pickup.awbNumber}</td>
                    <td className="py-10 px-4 border">{pickup.status}</td>
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
                    <td className="py-10 px-4 border">
                      {formatFirestoreTimestamp(pickup.pickupDatetime)}
                    </td>
                    <td className="py-10 px-4 border">
                      {pickup.pickupBookedBy}
                    </td>
                    <td className="py-6 px-4 border text-center">
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
                    <td className="p-4 border text-center">
                      <button
                        onClick={() => handleEditClick(pickup)}
                        className="text-purple-600 hover:underline text-[16px] font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="12"
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
