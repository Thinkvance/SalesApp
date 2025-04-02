import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { getData } from "country-list";
import Nav from "./Nav";
import { db, storage } from "./firebase";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import axios from "axios";
import collectionName_baseAwb from "./functions/collectionName";
import utility from "./Utility/utilityFunctions";
function PickupBooking() {
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [countryCodeToName, setCountryCodeToName] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [imageURLs, setImageURLs] = useState([]);
  const [username, setUsername] = useState("");
  const [files, setFiles] = useState([]);
  const [awbNumber, setawbNumber] = useState();
  const [frachise, setfrachise] = useState("");
  const [clientName, setClientName] = useState("");
  const [service, setservice] = useState("");
  const [latitudelongitude, setlatitudelongitude] = useState("");
  const [error, seterror] = useState("");
  const [isSourceFixed, setIsSourceFixed] = useState(false);
  const [sourceOptions, setSourceOptions] = useState([
    "FB Ad",
    "Google Ad",
    "Website Ad",
    "Direct Ad",
    "Whatsapp Campaign",
    "REP",
    "Customer Refer",
    "Employee Refer",
    "Offline Ad",
    "GMB",
  ]);
  const [source, setsource] = useState("");
  function splitLati_Logi(value) {
    const [lat, long] = value.split(",").map(Number);
    // Format the latitude and longitude to match the output precision
    const formattedLat = lat.toFixed(12);
    const formattedLong = long.toFixed(11);
    return { latitude: formattedLat, longitude: formattedLong };
  }

  const {
    control,
    setValue,
    register,
    watch,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();
  const barcodeRef = useRef(null);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate(); // Gets the day (1-31)
    const month = date.getMonth() + 1; // Gets the month (0-11), so add 1
    const year = date.getFullYear(); // Gets the full year
    return `${day}-${month}-${year}`; // Format as "DD-M"
  };

  // Example usage
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("LoginCredentials")).name;
    setUsername(data);
  }, []);

  useEffect(() => {
    var countryData = getData();
    const updatedCountryData = countryData.map(({ name }) => ({ name }));
    countryData.push({ code: "UAE", name: "United Arab Emirates" });
    countryData.push({ code: "EU", name: "Singapore" });
    countryData.push({ code: "US", name: "USA" });

    countryData = countryData.map((country) =>
      country.code == "GB" ? { ...country, name: "United Kingdom" } : country
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
      a.name.localeCompare(b.name)
    );

    // Map top countries to their data
    const topCountryData = topCountries
      .map((name) => sortedCountries.find((country) => country.name === name))
      .filter(Boolean); // Remove any undefined entries

    // Filter out top countries from sorted list
    const remainingCountries = sortedCountries.filter(
      (country) => !topCountries.includes(country.name)
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

  const auto_populate = async (phoneNumber) => {
    if (phoneNumber.length >= 9 && phoneNumber.length <= 10) {
      try {
        const q = query(
          collection(db, "pickup"),
          where("consignorphonenumber", "==", phoneNumber)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();
          const dynamicSource = "REP"; // Get source from DB
          // Ensure the dynamic source is added to options first
          setSourceOptions((prev) =>
            prev.includes(dynamicSource) ? prev : [...prev, dynamicSource]
          );

          // Wait for state update before setting value
          setTimeout(() => {
            setValue("source", dynamicSource); // Set form value dynamically
            setsource(dynamicSource);
            setIsSourceFixed(true); // Disable the field
          }, 100);
        } else {
          // Reset if no match found
          setValue("source", source); // Set form value dynamically
          setsource(source);
          setIsSourceFixed(false);
        }
      } catch (error) {
        console.log(error);
      }
    } else {
      // Reset if input is too short or long
      setValue("source", "Select");
      setIsSourceFixed(false);
    }
  };
  async function checkRepeatedCustomer(phoneNumber) {
    const q = query(
      collection(db, "pickup"),
      where("consignorphonenumber", "==", phoneNumber)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data();
      const dynamicSource = "REP"; // Get source from DB
      return dynamicSource;
    }
    return false;
  }

  const onSubmit = async (data) => {
    console.log(data.Consignornumber);
    try {
      if (latitudelongitude == "") {
        seterror("Latitude & Longitude  Is Required!");
        return;
      }
      setLoading(true);
      seterror("");
      const result = splitLati_Logi(latitudelongitude);
      const destinationCountryName =
        countryCodeToName[data.country] || data.country;
      // Step 1: Fetch current maximum awbNumber
      const pickupsRef = collection(
        db,
        collectionName_baseAwb.getCollection(
          frachise
            ? frachise
            : JSON.parse(localStorage.getItem("LoginCredentials")).Location
        )
      );
      const snapshot = await getDocs(pickupsRef);
      let maxAwbNumber = collectionName_baseAwb.getFranchiseBasedAWb(
        frachise
          ? frachise
          : JSON.parse(localStorage.getItem("LoginCredentials")).Location
      ); // Initialize to 0
      // testing
      if (!snapshot.empty) {
        snapshot.forEach((doc) => {
          const pickupData = doc.data();
          if (pickupData.awbNumber) {
            maxAwbNumber = Math.max(
              maxAwbNumber,
              parseInt(pickupData.awbNumber)
            );
          }
        });
      }

      // Step 2: Increment awbNumber
      const newAwbNumber = maxAwbNumber + 1;
      const uploadedImageURLs = await uploadImages(files, newAwbNumber);
      // Step 3: Store new document
      await addDoc(pickupsRef, {
        // Consignor Data
        consignorname: data.Consignorname,
        consignorphonenumber: data.Consignornumber,
        consignorlocation: data.Consignorlocation,
        // Consignee Data
        consigneename: data.consigneename,
        consigneephonenumber: data.consigneenumber,
        consigneelocation: data.consigneelocation,
        content: data.Content,
        longitude: result.longitude,
        latitude: result.latitude,
        pincode: data.pincode,
        destination: destinationCountryName, // Use full country name here
        pickupInstructions: data.instructions,
        weightapx: data.weight + " KG",
        pickupDatetime:
          formatDate(data.pickupDate) +
          " " +
          "&" +
          data.pickupHour +
          " " +
          data.pickupPeriod,
        franchise: frachise,
        awbNumber: newAwbNumber, // Add the new awbNumber here
        vendorName: data.vendor,
        service: service,
        imageUrLs: null,
        pickupCompletedDatatime: null,
        pickUpPersonName: "Unassigned",
        postNumberOfPackages: null,
        postPickupWeight: null,
        actualNoOfPackages: null,
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
        KycImage: uploadedImageURLs.length == 0 ? "" : uploadedImageURLs[0],
        Source: source,
      });

      if (!(await checkRepeatedCustomer(data.Consignornumber))) {
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
                  language: "en_US",
                  templateName: "shipmentbooked_dynamic",
                  templateData: {
                    body: {
                      placeholders: [data.Consignorname],
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
          }
        );
        return;
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
                  templateName: "repeatedbookingtemplate",
                  templateData: {
                    body: {
                      placeholders: [data.Consignorname],
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
          }
        );
        console.log(response.data);
      }

      // await utility.sendNotification();
      // utility.SuccessNotify("Pickup request submitted successfully.");
      setFiles([]);
      setIsSourceFixed(false);
      reset();
    } catch (error) {
      utility.ErrorNotify("Failed to book the pickup. Please try again.");
      console.log(error);
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
            // Calculate upload progress
            const progress = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
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
          }
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
  return (
    <div className="">
      <Nav />
      {/* <button
        onClick={async () => {
          utility.sendNotification();
        }}
      >
        TEST
      </button> */}
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4  flex-col gap-4">
        <h className="text-3xl font-bold">Sales</h>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white p-6 rounded-md shadow-none w-full max-w-4xl"
        >
          <h2 className="text-xl font-bold text-center mb-6 text-gray-800">
            Submit Pickup Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Consignee */}
            <div>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  Consignor Name:
                </label>
                <input
                  type="text"
                  placeholder="Enter consignor name"
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
                  Consignor Phone Number:
                </label>
                <input
                  type="text"
                  placeholder="Enter consignor phone number"
                  {...register("Consignornumber", {
                    required: "Consignor phone number is required",
                    pattern: {
                      value: /^[0-9]+$/,
                      message: "Please enter a valid phone number",
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
                  Consignor address:
                </label>
                <input
                  type="text"
                  placeholder="Enter Consignor location"
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
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  Consignee Name:
                </label>
                <input
                  type="text"
                  placeholder="Enter consignee name"
                  {...register("consigneename", {
                    // testing....
                    required: "Consignee name is required",
                  })}
                  className={`w-full px-3 py-2 border ${
                    errors.consigneename ? "border-red-500" : "border-gray-300"
                  } rounded-md focus:outline-none focus:border-[#8847D9]`}
                />
                {errors.consigneename && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.consigneename.message}
                  </p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  Consignee Phone Number:
                </label>
                <input
                  type="text"
                  placeholder="Enter consignee phone number"
                  {...register("consigneenumber", {
                    required: "consignee phone number is required",
                    pattern: {
                      value: /^[0-9]+$/,
                      message: "Please enter a valid phone number",
                    },
                  })}
                  className={`w-full px-3 py-2 border ${
                    errors.consigneenumber
                      ? "border-red-500"
                      : "border-gray-300"
                  } rounded-md focus:outline-none focus:border-[#8847D9]`}
                />
                {errors.consigneenumber && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.consigneenumber.message}
                  </p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  Consignee address:
                </label>
                <input
                  type="text"
                  placeholder="Enter consignee location"
                  {...register("consigneelocation", {
                    required: "Enter consignee location",
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
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">
                Country (Destination):
              </label>
              <select
                {...register("country", { required: "Country is required" })}
                className={`w-full px-3 py-2 border ${
                  errors.country ? "border-red-500" : "border-gray-300"
                } rounded-md focus:outline-none focus:border-[#8847D9]`}
              >
                <option value="">Select your country</option>
                {countries.map((country) =>
                  country ? (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ) : null
                )}
              </select>
              {errors.country && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.country.message}
                </p>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">
                Pickup Pincode:
              </label>
              <input
                type="text"
                placeholder="Enter your pincode"
                {...register("pincode", { required: "Pincode is required" })}
                className={`w-full px-3 py-2 border ${
                  errors.pincode ? "border-red-500" : "border-gray-300"
                } rounded-md focus:outline-none focus:border-[#8847D9]`}
              />
              {errors.pincode && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.pincode.message}
                </p>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">
                Pickup Area:
              </label>
              <input
                type="text"
                placeholder="Enter your pickup area"
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
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                Weight (approx):
              </label>
              <input
                type="number"
                placeholder="Enter weight without units"
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
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                Content (Products):
              </label>
              <input
                type="text"
                placeholder="Enter list of products"
                {...register("Content", {
                  required: "list of products is required",
                })}
                className={`w-full px-3 py-2 border ${
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
                Vendor:
              </label>
              <select
                {...register("vendor", { required: "Vendor is required" })}
                className={`w-full px-3 py-2 border ${
                  errors.vendor ? "border-red-500" : "border-gray-300"
                } rounded-md focus:outline-none focus:border-[#8847D9]`}
              >
                <option value="">Select a vendor</option>
                <option value="DHL">DHL</option>
                <option value="Aramex">ARAMEX</option>
                <option value="UPS">UPS</option>
                <option value="FedEx">FedEx</option>
                <option value="SELF">SELF</option>
                <option value="BOMBINO">BOMBINO</option>
                <option value="ATLANTIC">ATLANTIC</option>
              </select>
              {errors.vendor && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.vendor.message}
                </p>
              )}
            </div>
            <div className="mb-4">
              <div className="flex gap-2 items-center mb-3 ">
                <label className="block text-gray-700 font-semibold mb-2">
                  Latitude & Longitude
                </label>
                {latitudelongitude ? (
                  <div
                    onClick={() => openMap()}
                    className="px-3 py-1 rounded-sm text-white bg-red-500 cursor-pointer"
                  >
                    Check
                  </div>
                ) : (
                  ""
                )}
              </div>
              <input
                type="text"
                placeholder="Enter Your Longitude & Latitude"
                className={`w-full px-3 py-2 border "border-gray-300 rounded-md focus:outline-none focus:border-[#8847D9]`}
                onChange={(e) => setlatitudelongitude(e.target.value)}
              />
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">
                Pickup Date:
              </label>
              <input
                type="date"
                {...register("pickupDate", {
                  required: "Pickup date is required",
                })}
                className={`w-full px-3 py-2 border ${
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
                Pickup Time:
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
                  {[...Array(12).keys()].map((hour) => (
                    <option key={hour + 1} value={hour + 1}>
                      {hour + 1}:00
                    </option>
                  ))}
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
            <div>
              <p className="text-gray-700 font-semibold mb-2">Service</p>
              <select
                className="w-1/2 px-3 py-2 border rounded-md focus:outline-none focus:border-[#8847D9]"
                {...register("service", {
                  required: "Service is required",
                })}
                onChange={(e) => {
                  setservice(e.target.value);
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
            <div>
              <p className="text-gray-700 font-semibold mb-2">Source</p>
              <select
                {...register("source", { required: "Source is required" })}
                value={source} // Ensure correct value
                disabled={isSourceFixed} // Disable if auto-populated
                className={`w-1/2 px-3 py-2 border rounded-md focus:outline-none ${
                  isSourceFixed
                    ? "bg-gray-200 cursor-not-allowed"
                    : "focus:border-[#8847D9]"
                }`}
                onChange={(e) => setsource(e.target.value)}
              >
                <option value="Select">Select</option>
                {sourceOptions?.map((option, index) => (
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
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">
                Special Instructions
              </label>
              <textarea
                placeholder="Enter any special instructions"
                {...register("instructions")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#8847D9]"
              ></textarea>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">
              Upload KYC Image (PDF Only):
            </label>
            <Controller
              name="kycFile"
              control={control}
              rules={{
                required: "Upload KYC Image",
                validate: (value) => {
                  if (files.length === 0) return "File is required.";
                  const file = files[0];
                  if (file.type !== "application/pdf") {
                    return "Only PDF files are allowed.";
                  }
                  return true;
                },
              }}
              render={({ field }) => (
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setFiles([file]); // Update state with the selected file
                      field.onChange(e.target.files); // Update form state
                    } else {
                      setFiles([]); // Clear files if no file is selected
                      field.onChange([]); // Clear form state
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#8847D9]"
                />
              )}
            />
            {errors.kycFile && (
              <p className="text-red-500 text-sm mt-1">
                {errors.kycFile.message}
              </p>
            )}
            {files.length > 0 && (
              <div className="mt-2">
                <p className="text-gray-700">{files[0].name}</p>{" "}
              </div>
            )}
          </div>
          <div className="flex justify-center">
            <button
              type="submit"
              className={`bg-[#8847D9] text-white font-semibold py-2 px-4 rounded-md transition duration-300 ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
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
      <canvas ref={barcodeRef} style={{ display: "none" }}></canvas>
    </div>
  );
}
export default PickupBooking;
