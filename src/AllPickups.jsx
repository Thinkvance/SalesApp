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
import DB from "./DB/DB";
import ShipmentDetails from "./ShipmentDetails";
import EditShipmentModal from "./EditShipmentModal";
import formatFirestoreTimestamp from "./Utility/formatFirestoreTimestamp";

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
  const [Location, setLocation] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false); // State to control modal visibility
  const [selectedPickup, setSelectedPickup] = useState(null); // State to hold the selected pickup for modal
  const [pickupPersons, setPickupPersons] = useState(["Unassigned"]);
  const [loadingEdit, setLoadingEdit] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "OpsPickupLoginCredentials"),
      (querySnapshot) => {
        const names = ["Unassigned"];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          Object.values(data).forEach((arr) => {
            names.push(arr[0]); // Push only the name (index 0)
          });
        });
        setPickupPersons(names);
      },
      (error) => {
        console.error("Error fetching pickup persons: ", error);
      }
    );

    return () => unsubscribe();
  }, []);

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

  const [editPickup, setEditPickup] = useState(null);
  const [isModalOpenEdit, setModalOpenEdit] = useState(false);
  const [Editedvalue, setEditedvalue] = useState(null);

  const handleEditClick = (pickup) => {
    setEditPickup({ ...pickup });
    setModalOpenEdit(true);
  };

  function formatString(input) {
    return input.trim().replace(/\s+/g, " ");
  }

  const handleSave = async (value) => {
    setLoadingEdit(true);
    console.log("value", typeof value.logisticCost);
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
          logisticCost: parseInt(value.logisticCost),
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

  useEffect(() => {
    if (!username) return;

    console.log("dateSearchTerm", dateSearchTerm);

    const unsubscribes = [];

    const fetchData = async () => {
      try {
        const collectionNames =
          Location === "ALL"
            ? [DB.db_collection, "franchise_pondy", "franchise_coimbatore"]
            : [
                collectionName_BaseAwb.getCollection(
                  Location === "HQ CHENNAI" ? "CHENNAI" : Location
                ),
              ];

        let startTimestamp = null;
        let endTimestamp = null;

        if (dateSearchTerm) {
          const dateObj = new Date(dateSearchTerm);
          const startDate = new Date(dateObj.setHours(0, 0, 0, 0));
          const endDate = new Date(dateObj.setHours(23, 59, 59, 999));
          startTimestamp = Timestamp.fromDate(startDate);
          endTimestamp = Timestamp.fromDate(endDate);
        } else {
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          startTimestamp = Timestamp.fromDate(oneMonthAgo);
        }

        const results = await Promise.all(
          collectionNames.map(
            (collec) =>
              new Promise((resolve, reject) => {
                const baseCollection = collection(db, collec);
                let q;

                if (dateSearchTerm) {
                  q = query(
                    baseCollection,
                    where("pickupDatetime", ">=", startTimestamp),
                    where("pickupDatetime", "<=", endTimestamp),
                    orderBy("pickupDatetime", "desc")
                  );
                } else {
                  q = query(
                    baseCollection,
                    where("pickupDatetime", ">=", startTimestamp),
                    orderBy("pickupDatetime", "desc")
                  );
                }

                const unsubscribe = onSnapshot(
                  q,
                  (snapshot) => {
                    const data = snapshot.docs.map((doc) => ({
                      ...doc.data(),
                      id: doc.id,
                    }));
                    resolve(data);
                  },
                  (error) => {
                    reject(error);
                  }
                );

                unsubscribes.push(unsubscribe);
              })
          )
        );

        const combinedData = results.flat();
        setPickups(combinedData);
      } catch (error) {
        console.error(error);
        utilityFunctions.ErrorNotify(
          "Unable to retrieve data. Please try again later."
        );
      }
    };

    fetchData();

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [username, role, Location, dateSearchTerm]);

  // Filter pickups based on search terms
  const filteredPickups = pickups.filter((pickup) => {
    const awbMatch = String(pickup.awbNumber)
      .toLowerCase()
      .includes(awbSearchTerm.toLowerCase());
    const consignorPhoneMatch = pickup.consignorphonenumber
      .toLowerCase()
      .includes(consignorPhoneSearchTerm.toLowerCase());
    const PhonesearchItem = pickup.pickUpPersonName
      .toLowerCase()
      .includes(PickupPersonName.toLowerCase());
    return awbMatch && consignorPhoneMatch && PhonesearchItem; // Use AND logic to filter
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
        <div className="mb-6  flex flex-row flex-wrap gap-6">
          <input
            type="text"
            placeholder="Search by AWB Number"
            value={awbSearchTerm}
            onChange={(e) => setAwbSearchTerm(e.target.value)}
            className="border border-gray-300 rounded py-2 px-4 w-fit mb-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
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
            placeholder="Consignor Phone Number"
            value={consignorPhoneSearchTerm}
            onChange={(e) => setConsignorPhoneSearchTerm(e.target.value)}
            className="border border-gray-300 rounded py-2 px-4 w-[220px] mb-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
          <select
            onChange={(e) => setPickUpPersonName(e.target.value)}
            className="border border-gray-300 rounded py-2 px-4 w-fit mb-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
          >
            {pickupPersons.map((d) => (
              <option value={d}>{d}</option>
            ))}
          </select>
        </div>

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
                <th className="py-3 px-4 border">Edit Shipment</th>
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
                      {formatFirestoreTimestamp(pickup.pickupDatetime)}
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
