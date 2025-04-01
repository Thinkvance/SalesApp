import React, { useEffect, useState } from "react";
import { collection, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase"; // Ensure Firebase is initialized correctly

const ExtraChargesModule = () => {
  const [vendorRates, setVendorRates] = useState({}); // Store fetched data from Firestore
  const [charges, setCharges] = useState({}); // Local charges to add for each vendor
  const [vendorNames, setVendorNames] = useState([]); // Unique vendor names

  // Fetch the vendor extra charges from Firestore
  useEffect(() => {
    const fetchVendorRates = async () => {
      try {
        const vendorRatesCollectionRef = collection(db, "vendorExtraCharges");
        const unsubscribe = onSnapshot(
          vendorRatesCollectionRef,
          (snapshot) => {
            const vendorData = {};
            const vendorArray = [];
            snapshot.forEach((doc) => {
              vendorData[doc.id] = doc.data().extraCharges || [];
              // Add unique vendor name to vendorArray
              if (!vendorArray.includes(doc.id)) {
                vendorArray.push(doc.id);
              }
            });
            setVendorNames(vendorArray); // Update the unique vendor names state
            setVendorRates(vendorData); // Store fetched data in vendorRates state
          },
          (err) => {
            console.error("Error fetching vendor rates:", err);
          }
        );

        // Cleanup the listener on unmount
        return () => unsubscribe();
      } catch (err) {
        console.error("Failed to fetch vendor rates:", err);
      }
    };
    fetchVendorRates();
  }, []);

  // Add a new charge to the local charges state
  const handleAddCharge = (courier) => {
    setCharges((prevCharges) => ({
      ...prevCharges,
      [courier]: [
        ...(prevCharges[courier] || []), // Preserve existing local charges
        { description: "", value: "", type: "%" }, // Add a new blank charge
      ],
    }));
  };

  // Handle input changes for description, value, and type
  const handleInputChange = (courier, index, field, value) => {
    setCharges((prevCharges) => {
      const updatedCharges = (prevCharges[courier] || []).map((charge, i) =>
        i === index ? { ...charge, [field]: value } : charge
      );
      return { ...prevCharges, [courier]: updatedCharges };
    });
  };

  // Save the charges to Firestore
  const handleSave = async () => {
    try {
      for (const courier of vendorNames) {
        const currentCharges = vendorRates[courier] || []; // Get existing charges from Firestore
        const newCharges = charges[courier] || []; // Local charges to add

        // Combine existing and new charges while ensuring no duplicates
        const combinedCharges = [
          ...currentCharges,
          ...newCharges.filter(
            (newCharge) =>
              !currentCharges.some(
                (existingCharge) =>
                  existingCharge.description === newCharge.description &&
                  existingCharge.value === newCharge.value &&
                  existingCharge.type === newCharge.type
              )
          ),
        ];

        const docRef = doc(db, "vendorExtraCharges", courier);
        // Update the document with the combined charges
        await updateDoc(docRef, { extraCharges: combinedCharges });
      }

      setCharges({}); // Reset local charges after saving
      alert("Extra charges saved successfully!");
    } catch (error) {
      console.error("Error saving extra charges:", error);
      alert("Failed to save extra charges. Check the console for details.");
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
    <h2 className="text-3xl font-semibold mb-8 text-gray-900 text-center">Manage Extra Charges</h2>
  
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {vendorNames?.map((courier) => (
        <div
          key={courier}
          className="p-6 bg-white rounded-lg shadow-lg border border-gray-200 space-y-6"
        >
          <h3 className="text-2xl font-semibold text-purple-800 mb-4">{courier}</h3>
  
          <button
            onClick={() => handleAddCharge(courier)}
            className="px-6 py-3 bg-purple-600 text-white text-base rounded-lg shadow-md hover:bg-purple-700 transition duration-300 w-full"
          >
            + Add Charge
          </button>
  
          <div className="space-y-6">
            {/* Existing Charges */}
            {vendorRates[courier]?.map((charge, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-100 px-6 py-4 rounded-lg shadow-sm"
              >
                <div className="w-1/3">
                  <input
                    type="text"
                    value={charge.description}
                    disabled
                    className="w-full bg-gray-100 text-gray-800 text-lg border-none rounded-lg p-3"
                  />
                </div>
                <div className="w-1/4">
                  <input
                    type="number"
                    value={charge.value}
                    disabled
                    className="w-full bg-gray-100 text-gray-800 text-lg border-none rounded-lg p-3"
                  />
                </div>
                <div className="w-1/4">
                  <select
                    value={charge.type}
                    disabled
                    className="w-full bg-gray-100 text-gray-800 text-lg border-none rounded-lg p-3"
                  >
                    <option value="%">%</option>
                    <option value="+">+</option>
                  </select>
                </div>
              </div>
            ))}
  
            {/* New Charges */}
            {charges[courier]?.map((charge, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-50 px-6 py-4 rounded-lg shadow-sm border border-gray-200"
              >
                <div className="w-1/3">
                  <input
                    type="text"
                    placeholder="Description"
                    value={charge.description}
                    onChange={(e) =>
                      handleInputChange(courier, index, "description", e.target.value)
                    }
                    className="w-full bg-white text-lg border border-gray-300 rounded-lg px-3 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div className="w-1/4">
                  <input
                    type="number"
                    placeholder="Value"
                    value={charge.value}
                    onChange={(e) =>
                      handleInputChange(courier, index, "value", e.target.value)
                    }
                    className="w-full bg-white text-lg border border-gray-300 rounded-lg px-3 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div className="w-1/4">
                  <select
                    value={charge.type}
                    onChange={(e) =>
                      handleInputChange(courier, index, "type", e.target.value)
                    }
                    className="w-full bg-white text-lg border border-gray-300 rounded-lg px-3 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="%">%</option>
                    <option value="+">+</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  
    <div className="text-center mt-12">
      <button
        onClick={handleSave}
        className="px-8 py-3 bg-green-600 text-white font-semibold text-lg rounded-lg shadow-md hover:bg-green-700 transition duration-300"
      >
        Save All Changes
      </button>
    </div>
  </div>
  );
};

export default ExtraChargesModule;