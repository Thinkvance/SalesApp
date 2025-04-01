import { useState, useEffect } from "react";
import axios, { all } from "axios";
import Nav from "./Nav";
import utilityFunctions from "./Utility/utilityFunctions";
import { doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { collection, onSnapshot } from "firebase/firestore";

const RateCardForm = () => {
  const [country, setCountry] = useState("UK");
  const [weight, setWeight] = useState("");
  const [weights, setWeights] = useState([]);
  const [selectedRate, setSelectedRate] = useState(null);
  const [rateData, setRateData] = useState({});
  const [Zones, setZones] = useState([]);
  const [Economy_Zones, setEconomy_Zones] = useState([]);
  const [Instructions, setInstructions] = useState([]);
  const [DeliverDays, setDeliverDays] = useState("");
  const [DAYSTODELIVER_Economy, setDAYSTODELIVER_Economy] = useState("");
  const [DAYSTODELIVER_Express, setDAYSTODELIVER_Express] = useState("");
  const [DAYSTODELIVER_DutyFree, setDAYSTODELIVER_DutyFree] = useState("");
  const [allCountryNames, setallCountryNames] = useState();

  const API_ENDPOINT =
    "https://script.google.com/macros/s/AKfycbzQTpIruNyz_uVoqbn221cdnhGWc7nRE7Q0JzUJiaCKZeYVxrlGTsVeFGWBdVJfDOgfNA/exec";
  const fetchData = async () => {
    const uploadDataToFirestore = async (data) => {
      try {
        for (const [key, value] of Object.entries(data)) {
          // Push each key as a document in Firestore
          await setDoc(doc(db, "rateCards", key), { entries: value });
        }
      } catch (error) {
        console.error("Error uploading data to Firestore:", error);
      } finally {
        // console.log("Data updated into firebase!");
      }
    };
    await axios.get(API_ENDPOINT).then((d) => {
      uploadDataToFirestore(d.data.data);
    });
  };
  useEffect(() => {
    fetchData();
  }, []);

  const fetchRateCards = () => {
    try {
      const rateCardsCollection = collection(db, "rateCards");

      // Set up real-time listener using onSnapshot
      const unsubscribe = onSnapshot(rateCardsCollection, (querySnapshot) => {
        const rateCardsData = {};
        querySnapshot.forEach((doc) => {
          rateCardsData[doc.id] = doc.data().entries;
        });

        // Extract country names
        const countries = Object.keys(rateCardsData);

        // Update states
        setallCountryNames(countries);
        setRateData(rateCardsData);
      });

      // Return the unsubscribe function to clean up the listener when the component unmounts
      return unsubscribe;
    } catch (error) {
      console.error("Error fetching rate cards data:", error);
    }
  };

  // Example usage
  useEffect(() => {
    const unsubscribe = fetchRateCards();

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (rateData[country]) {
      setWeights(rateData[country].map((item) => item.Weight_slab));
    }
  }, [country, rateData]);

  useEffect(() => {
    if (rateData[country]) {
      const rate = rateData[country].find(
        (item) => item.Weight_slab === weight
      );
      setSelectedRate(rate);
    }
  }, [country, weight, rateData]);

  useEffect(() => {
    let zonesData = [];
    let economyZonesData = [];
    let instructionsData = [];
    rateData[country]?.map((d) => {
      if (d.EXPRESS_ZONES) zonesData.push(d.EXPRESS_ZONES);
    });
    rateData[country]?.map((d) => {
      if (d.ECONOMY_ZONES) economyZonesData.push(d.ECONOMY_ZONES);
    });
    rateData[country]?.map((d) => {
      if (d.INSTRUCTIONS) instructionsData.push(d.INSTRUCTIONS);
    });

    setZones(zonesData);
    setEconomy_Zones(economyZonesData);
    setInstructions(instructionsData);

    if (
      rateData[country] &&
      rateData[country][0] &&
      rateData[country] &&
      rateData[country][0]["DAYSTODELIVER_Economy"] &&
      rateData[country][0]["DAYSTODELIVER_Express"] &&
      rateData[country][0]["DAYSTODELIVER_DutyFree"]
    ) {
      console.log("rateData", rateData[country][0]["DAYSTODELIVER_Express"]);
      setDAYSTODELIVER_Economy(rateData[country][0]["DAYSTODELIVER_Economy"]);
      setDAYSTODELIVER_Express(rateData[country][0]["DAYSTODELIVER_Express"]);
      setDAYSTODELIVER_DutyFree(rateData[country][0]["DAYSTODELIVER_DutyFree"]);
    } else {
      setDeliverDays("");
      setDAYSTODELIVER_Economy("");
      setDAYSTODELIVER_Express("");
      setDAYSTODELIVER_DutyFree("");
    }
  }, [country, rateData]);
  return (
    <>
      <Nav />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 flex flex-col justify-center items-center pt-8 pb-8">
        <div className="w-full max-w-7xl flex flex-wrap  flex-col lg:flex-row justify-center gap-8 px-4">
          {/* Left Section */}
          <div className=" relative w-full lg:w-[40%] bg-white rounded-xl shadow-md p-4 lg:p-6">
            <h2 className="text-2xl lg:text-3xl font-semibold text-purple-700 mb-4">
              Rate Card Form
            </h2>
            <p className="text-green-500 font-bold text-2xl absolute top-4 right-8">
              {DeliverDays}
            </p>
            <form className="space-y-4">
              {/* Country Selector */}
              <div>
                <label className="block text-gray-700 font-medium mb-2 text-sm lg:text-base">
                  Select Country:
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                >
                  {allCountryNames?.map((sheet) => (
                    <option key={sheet} value={sheet}>
                      {sheet}
                    </option>
                  ))}
                </select>
              </div>
              {/* Weight Selector */}
              <div>
                <label className="block text-gray-700 font-medium mb-2 text-sm lg:text-base">
                  Select Weight Slab:
                </label>
                <select
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                >
                  <option value="">Select Weight</option>
                  {weights.map((weightOption, index) => (
                    <option key={index} value={weightOption}>
                      {weightOption}
                    </option>
                  ))}
                </select>
              </div>
            </form>
          </div>

          {/* Rate Details */}
          <div className="w-full lg:w-[40%] bg-white rounded-xl shadow-lg p-4 lg:p-6">
            <h2 className="text-2xl lg:text-3xl font-bold text-purple-700 mb-4">
              Rate Details
            </h2>
            <div></div>
            {selectedRate ? (
              <table className="w-full text-left border border-gray-200 rounded-lg overflow-hidden text-sm">
                <thead className="bg-purple-100 text-gray-700">
                  <tr>
                    <th className="px-2 lg:px-4 py-2">
                      <p className="text-[10px] text-green-700 font-extrabold">
                        {"Days"}
                      </p>
                      <p>Weight</p>
                    </th>
                    <th className="px-2 lg:px-4 py-2">
                      <p className="text-[10px] text-green-700 font-extrabold">
                        {DAYSTODELIVER_Economy}
                      </p>
                      <p>Economy</p>
                    </th>
                    <th className="px-2 lg:px-4 py-2 ">
                      <p className="text-[10px] text-green-700 font-extrabold">
                        {DAYSTODELIVER_Express}
                      </p>
                      <p>Express</p>
                    </th>
                    <th className="px-2 lg:px-4 py-2">
                      <p className="text-[10px] text-green-700 font-extrabold">
                        {DAYSTODELIVER_DutyFree}
                      </p>
                      <p>EcoDutyFree</p>
                    </th>
                    <th className="px-2 lg:px-4 py-2">Eco Self</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-gray-50 hover:bg-gray-100">
                    <td className="px-2 lg:px-4 py-2">
                      {selectedRate.Weight_slab}
                    </td>
                    <td className="px-2 lg:px-4 py-2">
                      {selectedRate.Economy}
                    </td>
                    <td className="px-2 lg:px-4 py-2">
                      {selectedRate.Express}
                    </td>
                    <td className="px-2 lg:px-4 py-2">
                      {selectedRate.EcoDutyFree}
                    </td>
                    <td className="px-2 lg:px-4 py-2">
                      {selectedRate.EcoSelf}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="text-gray-600 mt-4 text-sm">
                Please select a weight slab to view rates.
              </p>
            )}
          </div>
          {/* Zones and Instructions */}
          <div className="w-full flex flex-col lg:flex-row gap-6 ">
            {/* Zones */}
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl shadow-md p-4 lg:p-6 h-[350px] overflow-y-auto">
              <h3 className="text-xl lg:text-2xl font-medium text-purple-700 mb-4">
                ECONOMY ZONES
              </h3>
              {Economy_Zones.length ? (
                <ul className="space-y-2">
                  {Economy_Zones.map((zone, index) => (
                    <li
                      key={index}
                      className="text-gray-700 w-fit bg-gray-100 px-3 py-2 rounded-md hover:bg-purple-50"
                    >
                      {zone}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600 text-sm">No zones available.</p>
              )}
            </div>

            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl shadow-md p-4 lg:p-6 h-[350px] overflow-y-auto">
              <h3 className="text-xl lg:text-2xl font-medium text-purple-700 mb-4">
                EXPRESS ZONES
              </h3>
              {Zones.length ? (
                <ul className="space-y-2">
                  {Zones.map((zone, index) => (
                    <li
                      key={index}
                      className="text-gray-700 w-fit bg-gray-100 px-3 py-2 rounded-md hover:bg-purple-50"
                    >
                      {zone}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600 text-sm">No zones available.</p>
              )}
            </div>

            {/* Instructions */}
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl shadow-md p-4 lg:p-6 h-[350px] overflow-y-auto">
              <h3 className="text-xl lg:text-2xl font-medium text-purple-700 mb-4">
                Instructions
              </h3>
              {Instructions.length ? (
                <ul className="space-y-2">
                  {Instructions.map((instruction, index) => (
                    <li
                      key={index}
                      className="text-gray-700 bg-gray-100 px-3 py-2 rounded-md"
                    >
                      {instruction}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600 text-sm">
                  No instructions available.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RateCardForm;
