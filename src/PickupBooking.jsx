import { useEffect, useRef, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { getData } from "country-list";
import Nav from "./Nav";
import { db, storage } from "./firebase";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  Timestamp,
  runTransaction,
  where,
} from "firebase/firestore";
import axios from "axios";
import collectionName_baseAwb from "./functions/collectionName";
import utility from "./Utility/utilityFunctions";
import DB from "./DB/DB";
import "react-phone-number-input/style.css";
import "react-phone-input-2/lib/style.css";
import sha256 from "crypto-js/sha256";
import countryList from "../src/CountryDialCode.json";
import ConsigneePhoneNumberInput from "./ConsigneePhoneNumberInput";
import createDefaultInternalTracking from "./Utility/createDefaultInternalTracking";

function PickupBooking() {
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [countryCodeToName, setCountryCodeToName] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [username, setUsername] = useState("");
  const [files, setFiles] = useState([]);
  const [frachise, setfrachise] = useState("");
  const [service, setservice] = useState("");
  const [latitudelongitude, setlatitudelongitude] = useState("");
  const [error, seterror] = useState("");
  const [isSourceFixed, setIsSourceFixed] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [awbLoading, setAwbLoading] = useState(true);
  const baseSourceOptions = useMemo(
    () => [
      "B To C",
      "FB Ad",
      "Google Ad",
      "Website Ad",
      "Direct Ad",
      "Whatsapp Campaign",
      "Repeated Customer",
      "Customer Refer",
      "Employee Refer",
      "Offline Ad",
      "GMB",
    ],
    [],
  );

  const [sourceOptions, setSourceOptions] = useState(baseSourceOptions);

  const [newAwbNumber, setnewAwbNumber] = useState();
  const [companyName, setcompanyName] = useState("");
  const [currentUser, setcurrentUser] = useState({});
  const [OnboradedClients, setOnboradedClients] = useState([]);
  const [AllOnboradedClients, setAllOnboradedClients] = useState([]);
  const [isOnboarded, setIsOnboarded] = useState(false); // false = NO
  const [ClientKYC, setClientKYC] = useState(""); // false = NO
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [networkError, setNetworkError] = useState(false);

  function deliveryTime(service, destination) {
    if (service === "Economy") {
      return "5 - 7 Working Days";
    }

    if (service === "Express") {
      return "3 - 4 Working Days";
    }

    if (service === "Duty Free") {
      if (destination === "United Kingdom") {
        return "5 - 7 Working Days";
      }
      if (destination === "New Zealand" || destination === "Australia") {
        return "8 - 15 Working Days";
      }
      return "8 - 12 Working Days";
    }

    return "-";
  }

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setNetworkError(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  console.log("isSourceFixed", isSourceFixed);

  function splitLati_Logi(value) {
    const [lat, long] = value.split(",").map(Number);
    // Format the latitude and longitude to match the output precision
    const formattedLat = lat.toFixed(12);
    const formattedLong = long.toFixed(11);
    return { latitude: formattedLat, longitude: formattedLong };
  }

  useEffect(() => {
    const pickupsRef = collection(db, DB.db_collection);
    let unsubscribe = null;

    function subscribeToPickups() {
      unsubscribe = onSnapshot(pickupsRef, (snapshot) => {
        let maxAwbNumber =
          collectionName_baseAwb.getFranchiseBasedAWb("CHENNAI");
        snapshot.forEach((doc) => {
          const pickupData = doc.data();
          if (pickupData.awbNumber) {
            maxAwbNumber = Math.max(
              maxAwbNumber,
              parseInt(pickupData.awbNumber),
            );
          }
        });

        setnewAwbNumber(maxAwbNumber + 1);
        setAwbLoading(false);
      });
    }

    subscribeToPickups();

    return () => {
      if (unsubscribe) {
        unsubscribe(); // Clean up the listener on unmount
      }
    };
  }, []);

  const {
    control,
    setValue,
    register,
    watch,
    handleSubmit,
    clearErrors,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {},
  });
  const barcodeRef = useRef(null);

  function convertToFirebaseTimestamp(dateString) {
    const [datePart, timePart, meridian] = dateString.split(" ");
    const [year, month, day] = datePart.split("-").map(Number);
    let [hours, minutes] = timePart.split(":").map(Number);

    if (meridian === "PM" && hours !== 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;

    const jsDate = new Date(year, month - 1, day, hours, minutes);

    return Timestamp.fromDate(jsDate);
  }

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("LoginCredentials")).name;
    setUsername(data);
  }, []);

  useEffect(() => {
    var countryData = getData();
    const updatedCountryData = countryData.map(({ name }) => ({ name }));
    countryData.push({ code: "UAE", name: "United Arab Emirates" });

    countryData = countryData.map((country) =>
      country.code == "GB" ? { ...country, name: "United Kingdom" } : country,
    );

    const topCountries = [
      "USA",
      "United Kingdom",
      "Canada",
      "Europe",
      "Singapore",
      "United Arab Emirates",
      "Malaysia",
      "Australia",
      "New Zealand",
      "China",
      "Germany",
      "France",
    ];

    // Sort countries alphabetically
    const sortedCountries = countryData.sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    // Map top countries to their data
    const topCountryData = topCountries
      .map((name) => sortedCountries.find((country) => country.name === name))
      .filter(Boolean); // Remove any undefined entries

    // Filter out top countries from sorted list
    const remainingCountries = sortedCountries.filter(
      (country) => !topCountries.includes(country.name),
    );

    // Combine top countries with remaining countries
    const orderedCountries = [...topCountryData, ...remainingCountries];

    setCountries(orderedCountries);

    // Create a map of country codes to names
    const codeToNameMap = orderedCountries.reduce((acc, country) => {
      acc[country.code] = country.name;
      return acc;
    }, {});

    setCountryCodeToName(codeToNameMap);
  }, []);

  function getRecentData(data) {
    return data.reduce((latest, current) => {
      const latestTime = latest?.pickupDatetime?.seconds ?? 0;
      const currentTime = current?.pickupDatetime?.seconds ?? 0;

      return currentTime > latestTime ? current : latest;
    });
  }

  const auto_populate = async (phoneNumber) => {
    if (phoneNumber.length >= 9 && phoneNumber.length <= 10) {
      try {
        const q = query(
          collection(db, DB.db_collection),
          where("consignorphonenumber", "==", phoneNumber),
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const data = querySnapshot.docs.map((doc) => doc.data());
          const dynamicSource = "Repeated Customer"; // Get source from DB
          const recentShipment = getRecentData(data);
          setSourceOptions((prev) =>
            prev.includes(dynamicSource) ? prev : [...prev, dynamicSource],
          );

          // Wait for state update before setting value
          setValue("Consignorlocation", recentShipment.consignorlocation);
          setValue("source", dynamicSource); // Set form value dynamically
          // setIsSourceFixed(true);
        } else {
          setValue("source", ""); // Set form value dynamically
          // setIsSourceFixed(false);
        }
      } catch (error) {
        console.log(error);
      }
    } else {
      // Reset if input is too short or long
      setValue("source", "");
      setIsSourceFixed(false);
    }
  };

  async function getNextAwbNumber(franchise = "CHENNAI") {
    const counterRef = doc(db, "awbCounters", franchise);
    return await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      if (!counterDoc.exists()) {
        const baseAwb = collectionName_baseAwb.getFranchiseBasedAWb(franchise);
        transaction.set(counterRef, { current: baseAwb });
        return baseAwb;
      }
      const newAwb = counterDoc.data().current + 1;
      transaction.update(counterRef, { current: newAwb });
      return newAwb;
    });
  }

  function truncateDate(timestamp) {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Convert Firestore Timestamp to JavaScript Date
    const date = new Date(timestamp.seconds * 1000);

    const day = String(date.getDate()).padStart(2, "0");
    const shortMonth = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day}-${shortMonth}-${year}`;
  }

  async function checkRepeatedCustomer(phoneNumber) {
    const q = query(
      collection(db, DB.db_collection),
      where("consignorphonenumber", "==", phoneNumber),
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data();
      const dynamicSource = "Repeated Customer"; // Get source from DB
      return dynamicSource;
    }
    return "Not REP";
  }

  async function sinceDatefun(phoneNumber) {
    const q = query(
      collection(db, DB.db_collection),
      where("consignorphonenumber", "==", phoneNumber),
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const allDocs = querySnapshot.docs.map((doc) => doc.data());
      allDocs.sort((a, b) => b.awbNumber - a.awbNumber);
      const mostRecent = allDocs[0];
      return truncateDate(mostRecent.pickupDatetime);
    }
  }

  const onSubmit = async (data) => {
    if (!navigator.onLine) {
      setNetworkError(true);
      return;
    }

    if (loading) return; // 🔒 prevents double click submit

    function removeSpaces(text) {
      if (typeof text !== "string") {
        console.warn("Input is not a string. Returning as is.");
        return text;
      }
      return text.replace(/\s/g, "");
    }

    let consigneephonenumber;
    if (data.consigneephonenumber) {
      consigneephonenumber = `${removeSpaces(data.countrycode)}${" "}${
        data.consigneephonenumber
      }`;
    } else {
      consigneephonenumber = "";
    }

    try {
      setLoading(true);
      seterror("");
      const pickupDateTime_firebase_timestamp = convertToFirebaseTimestamp(
        `${data.pickupDate + " " + data.pickupHour + " " + data.pickupPeriod}`,
      );
      const internalTracking = createDefaultInternalTracking(
        pickupDateTime_firebase_timestamp,
      );
      const result = splitLati_Logi(data.latlong);
      const destinationCountryName =
        countryCodeToName[data.country] || data.country;
      // Step 1: Fetch current maximum awbNumber
      const pickupsRef = collection(db, DB.db_collection);

      // Step 2: Increment awbNumber
      const newAwbNumber = await getNextAwbNumber();
      const uploadedImageURLs = await uploadImages(files, newAwbNumber);
      const isRepeated = await checkRepeatedCustomer(data.Consignornumber);
      const sinceDate = await sinceDatefun(data.Consignornumber); // Output: 08-Apr-2025
      await addDoc(pickupsRef, {
        WHReached: false,
        KmDriven: 0,
        internalTracking,
        companyName: companyName,

        // Consignor Data
        consignorname: data.Consignorname,
        consignorphonenumber: data.Consignornumber,
        consignorlocation: data.Consignorlocation,
        // Consignee Data
        consigneename: data.consigneename,
        consigneephonenumber: consigneephonenumber,
        consigneelocation: data.consigneelocation,
        content: data.Content,
        longitude: result.longitude,
        latitude: result.latitude,
        pincode: data.pincode,
        awbHashedValue: sha256(newAwbNumber.toString()).toString(),
        destination: destinationCountryName, // Use full country name here
        pickupInstructions: data.instructions,
        weightapx: data.weight + " KG",
        pickupDatetime: pickupDateTime_firebase_timestamp,
        franchise: frachise,
        awbNumber: newAwbNumber, // Add the new awbNumber here
        vendorName: null,
        service: service,
        imageUrLs: null,
        pickupCompletedDatatime: null,
        pickUpPersonName: "Unassigned",
        postNumberOfPackages: null,
        postPickupWeight: null,
        actualNoOfPackages: null,
        reviewNotificationSent: false,
        actualWeight: null,
        PaymentComfirmedDate: "",
        status: "RUN SHEET",
        pickupBookedBy: username,
        vendorAwbnumber: null,
        pickUpPersonNameStatus: null,
        pickuparea: data.pickuparea,
        rtoIfAny: null,
        packageConnectedDataTime: null,
        logisticCost: null,
        KycImage: isOnboarded
          ? ClientKYC
          : uploadedImageURLs.length == 0
            ? ""
            : uploadedImageURLs[0],
        Source: data.source,
        City: data.city,
      });
      if (isRepeated == "Not REP") {
        const options = {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            Authorization: "key_z6hIuLo8GC",
          },
          data: {
            messages: [
              {
                from: "+919600690881",
                to: `+91${data.Consignornumber}`,
                content: {
                  language: "en",
                  templateName: "shipmentbookedfinaltest4",
                  templateData: {
                    body: {
                      placeholders: [
                        data.Consignorname,
                        destinationCountryName,
                        data.service,
                        deliveryTime(data.service, destinationCountryName),
                      ],
                    },
                  },
                },
              },
            ],
          },
        };
        const response = await axios.post(
          "https://public.doubletick.io/whatsapp/message/template",
          options.data,
          {
            headers: options.headers,
          },
        );
      } else {
        const options = {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            Authorization: "key_z6hIuLo8GC", // Add your authorization token here
          },
          data: {
            messages: [
              {
                from: "+919600690881",
                to: `+91${data.Consignornumber}`,
                content: {
                  language: "en",
                  templateName: "repeatedcustomer_final",
                  templateData: {
                    body: {
                      placeholders: [
                        data.Consignorname,
                        sinceDate,
                        destinationCountryName,
                      ],
                    },
                  },
                },
              },
            ],
          },
        };
        const response = await axios.post(
          "https://public.doubletick.io/whatsapp/message/template",
          options.data,
          {
            headers: options.headers,
          },
        );
      }

      setFiles([]);
      setIsSourceFixed(false);
      setValue("source", "");
      // reset();
      setUploadProgress({});
      setIsOnboarded(false);
      setShowModal(true);
      setcompanyName("");
      setlatitudelongitude("");
      setTimeout(() => {
        setShowModal(false);
      }, 1000);

      utility.sendNotification().catch(console.warn);

      utility.SuccessNotify("Pickup request submitted successfully.");
    } catch (error) {
      console.error("Submission failed:", error);
      // Network / timeout / Firebase errors
      if (
        error.code === "unavailable" ||
        error.message?.includes("Network") ||
        !navigator.onLine
      ) {
        setNetworkError(true);
      } else {
        console.log(error);
        utility.ErrorNotify("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const uploadImages = async (images, awbnumber) => {
    const uploadedURLs = [];
    const uploadPromises = images.map((image, index) => {
      const imageRef = ref(storage, `${awbnumber}/KYC/${image.name}`);
      const uploadTask = uploadBytesResumable(imageRef, image);
      return new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
            );
            setUploadProgress((prev) => ({ ...prev, [index]: progress }));
          },
          (error) => reject(error),
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              uploadedURLs.push(downloadURL);
              resolve();
            } catch (error) {
              reject(error);
            }
          },
        );
      });
    });
    await Promise.all(uploadPromises);
    return uploadedURLs;
  };
  function openMap() {
    const result = splitLati_Logi(latitudelongitude);
    const googleMapsUrl = `https://www.google.com/maps?q=${result.latitude},${result.longitude}`;
    window.open(googleMapsUrl, "_blank");
  }

  const selectedCountryCode = watch("country");

  useEffect(() => {
    if (selectedCountryCode) {
      const country = countryList.find((c) => c.name === selectedCountryCode);
      if (country) {
        setValue("countrycode", country.dialCode);
      }
    }
  }, [selectedCountryCode, setValue]);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("LoginCredentials"));
    setcurrentUser(data);
  }, []);

  function auto_populate_BtoC(CompanyName) {
    const client = AllOnboradedClients.find(
      (client) => client.companyName == CompanyName,
    );

    if (client) {
      setValue("Consignorname", client.consignorName);
      setValue("Consignornumber", client.consignorPhone);
      setValue("Consignorlocation", client.consignorAddress);
      setValue("pincode", client.pincode);

      setValue("city", client.city);
      setValue("pickuparea", client.pickupArea);
      setValue("source", "B To C");
      setValue("instructions", client.specialInstructions);
      setValue("latlong", client.coordinates);
      setClientKYC(client.kycFileUrl);
      setIsSourceFixed(true);
    } else {
      setValue("Consignorname", "");
      setValue("Consignornumber", "");
      setValue("Consignorlocation", "");
      setValue("pincode", "");

      setValue("city", "");
      setValue("pickuparea", "");
      setValue("source", "");
      setValue("instructions", "");
      setIsSourceFixed(false);
    }
  }

  useEffect(() => {
    if (!isOnboarded) {
      setcompanyName("");
      setClientKYC("");
      setlatitudelongitude("");
      setValue("city", "");
      setValue("Consignorname", "");
      setValue("Consignornumber", "");
      setValue("Consignorlocation", "");
      setValue("pincode", "");
      setValue("pickuparea", "");
      setValue("instructions", "");
      setValue("source", "");
      setValue("latlong", "");
      setValue("country", "");
      setValue("consigneename", "");
      setValue("consigneephonenumber", "");
      setValue("consigneelocation", "");
      setservice("");
      setValue("service", "");
      setValue("pickupDate", "");
      setValue("pickupHour", "");
      setValue("weight", "");
      setValue("Content", "");
      setFiles([]);
      setIsSourceFixed(false);
    }
  }, [isOnboarded]);

  const fetchClientOnboardingData = async (currentUser) => {
    if (!currentUser?.name || !currentUser?.email) {
      console.log("Current user not ready, skipping fetch");
      return [];
    }

    try {
      const q = query(
        collection(db, DB.ClientOnboarding),
        where("CreatedBy", "==", currentUser.name),
        where("CreatedByEmail", "==", currentUser.email),
        where("isApproved", "==", true),
      );

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching ClientOnboarding data:", error);
      throw error;
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    const loadData = async () => {
      const data = await fetchClientOnboardingData(currentUser);
      const onboardedClients = [
        ...new Set(data.map((item) => item.companyName).filter(Boolean)),
      ];

      setOnboradedClients(onboardedClients);
      setAllOnboradedClients(data);
    };

    loadData();
  }, [currentUser]);

  return (
    <div className="">
      <Nav />
      <div className="min-h-screen bg-white  flex items-center justify-center px-4 flex-col gap-4 pt-5">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white p-3 sm:p-6  border border-gray-300 rounded-md shadow-none w-full max-w-4xl relative"
        >
          <h2
            className="text-lg sm:text-2xl font-bold text-center mb-12 sm:mb-6 
text-transparent bg-clip-text bg-gradient-to-r from-[#8847D9] to-[#6D28D9] 
tracking-wide"
          >
            Schedule a Pickup
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              {OnboradedClients.length >= 1 && (
                <div className="flex items-center gap-3 mb-6 absolute top-14 sm:top-7">
                  <span className="font-semibold ">B To C</span>
                  <button
                    type="button"
                    onClick={() => setIsOnboarded((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300
      ${isOnboarded ? "bg-[#8847D9]" : "bg-gray-300"}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-300
        ${isOnboarded ? "translate-x-5" : "translate-x-1"}`}
                    />
                  </button>
                </div>
              )}

              <div className="mb-4 relative">
                <label className="block text-gray-700 font-semibold mb-2">
                  AWB Number
                </label>

                <input
                  type="text"
                  value={awbLoading ? "" : newAwbNumber}
                  placeholder={awbLoading ? "Generating AWB..." : "AWB Number"}
                  readOnly
                  disabled={awbLoading}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none
      ${
        awbLoading
          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
          : "border-gray-300 focus:border-[#8847D9]"
      }`}
                />

                {awbLoading && (
                  <div className="absolute right-3 top-10">
                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {/* Company Name */}
              {isOnboarded && (
                <div className="mb-4">
                  <label className="block text-gray-700 font-semibold mb-2">
                    Company Name
                  </label>
                  <select
                    className="px-3 py-2 w-full border rounded-md focus:outline-none focus:border-[#8847D9]"
                    value={companyName}
                    onChange={(e) => {
                      setcompanyName(e.target.value);
                      auto_populate_BtoC(e.target.value);
                    }}
                  >
                    <option value={"select client"}>select client</option>

                    {OnboradedClients.map((client) => (
                      <option value={client}>{client}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  Consignor Name
                </label>
                <input
                  disabled={isSourceFixed}
                  type="text"
                  placeholder="E.g. Ram Kumar (Letters only)"
                  {...register("Consignorname", {
                    required: "Consignor name is required",
                  })}
                  className={`w-full px-3 py-2 border ${
                    errors.Consignorname ? "border-red-500" : "border-gray-300"
                  } rounded-md focus:outline-none focus:border-[#8847D9]`}
                />
                {errors.Consignorname && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.Consignorname.message}
                  </p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  Consignor Phone Number
                </label>
                <input
                  type="text"
                  disabled={isSourceFixed}
                  placeholder="E.g. 9876543210 (10 digits, should not add '+91')"
                  {...register("Consignornumber", {
                    required: "Consignor phone number is required",
                    pattern: {
                      value: /^[0-9]+$/,
                      message: "Please enter a valid phone number",
                    },
                    maxLength: {
                      value: 10,
                      message: "Phone number cannot exceed 10 digits",
                    },
                    onChange: (e) => {
                      // Remove non-numeric characters
                      e.target.value = e.target.value.replace(/[^0-9]/g, "");
                      auto_populate(e.target.value);
                    },
                  })}
                  className={`w-full px-3 py-2 border ${
                    errors.Consignornumber
                      ? "border-red-500"
                      : "border-gray-300"
                  } rounded-md focus:outline-none focus:border-[#8847D9]`}
                />
                {errors.Consignornumber && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.Consignornumber.message}
                  </p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  Consignor address
                </label>
                <input
                  type="text"
                  disabled={isSourceFixed}
                  placeholder="E.g. Door No, Area, City, State, Pincode"
                  {...register("Consignorlocation", {
                    required: "Enter Consignor location",
                  })}
                  className={`w-full px-3 py-2 border ${
                    errors.Consignorlocation
                      ? "border-red-500"
                      : "border-gray-300"
                  } rounded-md focus:outline-none focus:border-[#8847D9]`}
                />
                {errors.Consignorlocation && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.Consignorlocation.message}
                  </p>
                )}
              </div>
            </div>
            {/* Consignee */}
            <div>
              <div>
                <div className="mb-4">
                  <label className="block text-gray-700 font-semibold mb-2">
                    Country (Destination)
                  </label>
                  <select
                    {...register("country", {
                      required: "Country is required",
                    })}
                    onChange={(e) => {
                      setValue("country", e.target.value);
                      setSelectedCountry(e.target.value?.toLowerCase());
                      clearErrors("country");
                    }}
                    className={`w-full px-3 py-2 border ${
                      errors.country ? "border-red-500" : "border-gray-300"
                    } rounded-md focus:outline-none focus:border-[#8847D9]`}
                  >
                    <option value="">Select Destination country</option>
                    {countryList.map((country) => (
                      <option key={country.code} value={country.name}>
                        {country.name} {country.dial_code}
                      </option>
                    ))}
                  </select>
                  {errors.country && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.country.message}
                    </p>
                  )}
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 font-semibold mb-2">
                    Consignee Name
                  </label>
                  <input
                    type="text"
                    placeholder="E.g. Ramesh Kumar (Letters Only)"
                    {...register("consigneename", {
                      // required: "Consignee name is required",
                    })}
                    className={`w-full px-3 py-2 border ${
                      errors.consigneename
                        ? "border-red-500"
                        : "border-gray-300"
                    } rounded-md focus:outline-none focus:border-[#8847D9]`}
                  />
                  {errors.consigneename && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.consigneename.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col">
                  <label className="block text-gray-700 font-semibold mb-2">
                    Consignee Phone Number
                  </label>
                  <div className="flex">
                    <ConsigneePhoneNumberInput
                      control={control}
                      errors={errors}
                      register={register}
                    />
                    <div className="w-full">
                      <input
                        type="text"
                        placeholder="Enter number without country code"
                        {...register("consigneephonenumber", {
                          pattern: {
                            value: /^[0-9]+$/,
                            message: "Only digits are allowed",
                          },
                          minLength: {
                            value: 6,
                            message: "Must be at least 6 digits",
                          },
                          maxLength: {
                            value: 15,
                            message: "Must be at most 15 digits",
                          },
                        })}
                        className={`w-[93%] border rounded-md ml-6 pl-2 py-2 ${
                          errors.consigneephonenumber
                            ? "border-red-500"
                            : "border-gray-400"
                        }`}
                      />
                      {errors.consigneephonenumber && (
                        <p className="text-red-500 ml-6 mt-1 text-sm">
                          {errors.consigneephonenumber.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  Consignee address
                </label>
                <input
                  type="text"
                  placeholder="E.g. Door No, Area, City, State, Pincode"
                  {...register("consigneelocation", {
                    // required: "Enter consignee location",
                  })}
                  className={`w-full px-3 py-2 border ${
                    errors.consigneelocation
                      ? "border-red-500"
                      : "border-gray-300"
                  } rounded-md focus:outline-none focus:border-[#8847D9]`}
                />
                {errors.consigneelocation && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.consigneelocation.message}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  Pickup Pincode
                </label>
                <input
                  disabled={isSourceFixed}
                  type="text"
                  placeholder="E.g. 560001 (6-digits)"
                  {...register("pincode", { required: "Pincode is required" })}
                  className={`w-fit px-3 py-2 border ${
                    errors.pincode ? "border-red-500" : "border-gray-300"
                  } rounded-md focus:outline-none focus:border-[#8847D9]`}
                />
                {errors.pincode && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.pincode.message}
                  </p>
                )}
              </div>
              <div>
                <p className="text-gray-700 font-semibold mb-2">City</p>
                <select
                  disabled={isSourceFixed}
                  {...register("city", { required: "City is required" })}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:border-[#8847D9]"
                >
                  <option value="">Select</option>
                  {[
                    "Chennai",
                    "Pondy",
                    "Coimbatore",
                    "mayiladuthurai",
                    "tirupur",
                    "Others",
                  ]?.map((option, index) => (
                    <option key={index} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.city && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.city.message}
                  </p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  Pickup Area
                </label>
                <input
                  disabled={isSourceFixed}
                  type="text"
                  placeholder="E.g. Guindy, T. Nagar"
                  {...register("pickuparea", {
                    required: "Pickup area is required",
                  })}
                  className={`w-full px-3 py-2 border ${
                    errors.pickuparea ? "border-red-500" : "border-gray-300"
                  } rounded-md focus:outline-none focus:border-[#8847D9]`}
                />
                {errors.pickuparea && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.pickuparea.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-700 font-semibold mb-2">Source</p>
                <select
                  {...register("source", { required: "Source is required" })}
                  disabled={isSourceFixed}
                  className={`px-3 py-2 border rounded-md ${
                    isSourceFixed
                      ? "bg-gray-200 cursor-not-allowed"
                      : "focus:border-[#8847D9]"
                  }`}
                >
                  <option value="">Select</option>
                  {sourceOptions.map((option, index) => (
                    <option key={index} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.source && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.source.message}
                  </p>
                )}
              </div>
              <div>
                <p className="text-gray-700 font-semibold mb-2">Service</p>
                <select
                  className="px-3 py-2 border rounded-md focus:outline-none focus:border-[#8847D9]"
                  {...register("service", {
                    required: "Service is required",
                  })}
                  onChange={(e) => {
                    setservice(e.target.value);
                    clearErrors("service"); // 👈 remove error
                  }}
                >
                  <option value="">Select</option>
                  <option value="Express">Express</option>
                  <option value="Economy">Economy</option>
                  <option value="Duty Free">Duty Free</option>
                </select>
                {errors.service && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.service.message}
                  </p>
                )}
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  Weight (approx)
                </label>
                <input
                  type="number"
                  placeholder="E.g. 25 (without units like kg, lbs)"
                  {...register("weight", {
                    required: "Weight is required",
                    valueAsNumber: true,
                  })}
                  className={`w-full px-3 py-2 border ${
                    errors.weight ? "border-red-500" : "border-gray-300"
                  } rounded-md focus:outline-none focus:border-[#8847D9]`}
                />
                {errors.weight && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.weight.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  Content (Products)
                </label>
                <textarea
                  type="text"
                  placeholder="E.g. Garments, Groceries, Handicrafts"
                  {...register("Content", {
                    required: "list of products is required",
                  })}
                  className={`w-10/12 px-3 py-2 border ${
                    errors.Content ? "border-red-500" : "border-gray-300"
                  } rounded-md focus:outline-none focus:border-[#8847D9]`}
                />
                {errors.Content && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.Content.message}
                  </p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  Special Instructions
                </label>
                <textarea
                  disabled={isSourceFixed}
                  placeholder="E.g. Take swiping machine, Bubble wrap, Take extra boxes"
                  {...register("instructions", {
                    // required: "Source is required",
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#8847D9]"
                ></textarea>
                {errors.instructions && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.instructions.message}
                  </p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  Latitude & Longitude
                </label>
                <input
                  type="text"
                  disabled={isSourceFixed}
                  placeholder="E.g. 11.000,12.000"
                  {...register("latlong", {
                    required: "Latitude & Longitude is required",
                    validate: (value) => {
                      // 1. Remove ALL spaces
                      const cleaned = value.replace(/\s/g, "");

                      // 2. Basic format check
                      const regex = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;
                      if (!regex.test(cleaned)) {
                        return "Invalid format. Use: latitude,longitude";
                      }

                      // 3. Extract values
                      const [lat, long] = cleaned.split(",").map(Number);

                      // 4. Range validation
                      if (lat < -90 || lat > 90) {
                        return "Latitude must be between -90 and 90";
                      }

                      if (long < -180 || long > 180) {
                        return "Longitude must be between -180 and 180";
                      }

                      return true;
                    },
                  })}
                  className={`w-fit px-3 py-2 border ${
                    errors.latlong ? "border-red-500" : "border-gray-300"
                  } rounded-md focus:outline-none focus:border-[#8847D9]`}
                />
                {errors.latlong && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.latlong.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  Pickup Date
                </label>
                <input
                  type="date"
                  {...register("pickupDate", {
                    required: "Pickup date is required",
                  })}
                  className={`w-fit px-3 py-2 border ${
                    errors.pickupDate ? "border-red-500" : "border-gray-300"
                  } rounded-md focus:outline-none focus:border-[#8847D9]`}
                />
                {errors.pickupDate && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.pickupDate.message}
                  </p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  Pickup Time
                </label>
                <div className="flex space-x-2">
                  <select
                    {...register("pickupHour", {
                      required: "Pickup hour is required",
                    })}
                    className={`w-1/2 px-3 py-2 border ${
                      errors.pickupHour ? "border-red-500" : "border-gray-300"
                    } rounded-md focus:outline-none focus:border-[#8847D9]`}
                  >
                    <option value="">Select Hour</option>
                    {[...Array(12).keys()].flatMap((hour) => [
                      <option key={`${hour + 1}:00`} value={`${hour + 1}:00`}>
                        {hour + 1}:00
                      </option>,
                      <option key={`${hour + 1}:30`} value={`${hour + 1}:30`}>
                        {hour + 1}:30
                      </option>,
                    ])}
                  </select>
                  <select
                    {...register("pickupPeriod", {
                      required: "AM/PM is required",
                    })}
                    className={`w-1/2 px-3 py-2 border ${
                      errors.pickupPeriod ? "border-red-500" : "border-gray-300"
                    } rounded-md focus:outline-none focus:border-[#8847D9]`}
                  >
                    <option value="">AM/PM</option>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>

                {errors.pickupHour && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.pickupHour.message}
                  </p>
                )}
                {errors.pickupPeriod && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.pickupPeriod.message}
                  </p>
                )}
              </div>
            </div>
          </div>
          {!isOnboarded && (
            <div className="mb-6">
              <label className="block text-gray-800 font-semibold mb-2">
                Upload KYC Document
                <span className="text-gray-500 text-sm ml-1">(PDF only)</span>
              </label>

              <Controller
                name="kycFile"
                control={control}
                render={({ field }) => (
                  <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-[#8847D9] transition-colors bg-gray-50">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setFiles([file]);
                          field.onChange(e.target.files);
                        } else {
                          setFiles([]);
                          field.onChange([]);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />

                    <div className="flex flex-col items-center justify-center text-center pointer-events-none">
                      <p className="text-sm text-gray-600 font-medium">
                        Click to upload KYC PDF
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Only PDF files are allowed
                      </p>
                    </div>
                  </div>
                )}
              />

              {errors.kycFile && (
                <p className="text-red-500 text-sm mt-2">
                  {errors.kycFile.message}
                </p>
              )}

              {files.length > 0 && (
                <div className="mt-3 flex items-center justify-between bg-purple-50 border border-purple-200 rounded-md px-3 py-2">
                  <p className="text-sm text-gray-800 font-medium truncate">
                    {files[0].name}
                  </p>
                  <span className="text-xs text-purple-600 font-semibold">
                    PDF
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-center mt-8">
            <button
              type="submit"
              className={`bg-gradient-to-r from-[#784AD6] to-[#7a3fd1] text-white font-semibold text-lg py-3 px-12 rounded-xl 
    shadow-lg hover:shadow-xl hover:scale-[1.03] active:scale-[0.98] 
    transition-all duration-200 ease-in-out
    focus:outline-none focus:ring-4 focus:ring-[#8847D9]/30
    ${loading ? "opacity-50 cursor-not-allowed hover:scale-100 shadow-md" : ""}`}
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white p-6 rounded-md shadow-lg w-80"
            onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside
          >
            <h2 className="text-xl font-bold text-center mb-4 text-gray-800">
              Success!
            </h2>
            <p className="text-center text-gray-700">
              Your pickup details have been submitted successfully.
            </p>
            <div className="mt-4 flex justify-center">
              <button
                onClick={closeModal}
                className="bg-[#8847D9] text-white font-semibold py-2 px-4 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {networkError && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-md shadow-lg w-80">
            <h2 className="text-lg font-bold text-center text-red-600 mb-2">
              Network Error
            </h2>
            <p className="text-center text-gray-700">
              Internet connection lost. Please check your network and try again.
            </p>
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setNetworkError(false)}
                className="bg-[#8847D9] text-white px-4 py-2 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <canvas ref={barcodeRef} style={{ display: "none" }}></canvas>
    </div>
  );
}
export default PickupBooking;
