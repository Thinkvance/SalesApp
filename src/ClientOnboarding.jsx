import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  FaLocationDot,
  FaHandshakeSimple,
  FaUserPlus,
  FaXmark,
} from "react-icons/fa6";
import { MdReceiptLong } from "react-icons/md";
import Nav from "./Nav";
import {
  collection,
  doc,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db, storage } from "./firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import Lottie from "lottie-react";

const ClientOnboarding = () => {
  const [countries, setCountries] = useState([]);
  const [countryInput, setCountryInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [animationData, setAnimationData] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdRef, setCreatedRef] = useState(null);

  useEffect(() => {
    try {
      fetch("/loading_animation.json")
        .then((response) => response.json())
        .then((data) => setAnimationData(data))
        .catch((error) => console.error("Error loading animation:", error));
    } catch (e) {
      console.log(e);
    }
  }, []);

  const {
    register,
    watch,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: "onChange", // 🔥 IMPORTANT
  });

  const onSubmit = async (data) => {
    try {
      setLoading(true); // 🔥 start loading
      // 🔹 Create Firestore doc first (guaranteed unique)

      const user = JSON.parse(localStorage.getItem("LoginCredentials"));
      const docRef = doc(collection(db, "ClientOnboarding"));

      // 🔹 Generate 8-digit reference from doc ID
      const referenceCode = docRef.id
        .replace(/\D/g, "")
        .slice(0, 8)
        .padEnd(8, "0");

      // 🔹 Extract files
      const kycFile = data.kyc[0];
      const rateCardFile = data.rateCard[0];

      // 🔹 Storage paths (using guaranteed unique reference)
      const kycRef = ref(storage, `Client-Onboarding/${referenceCode}/kyc.pdf`);

      const rateCardRef = ref(
        storage,
        `Client-Onboarding/${referenceCode}/rateCard.xlsx`,
      );

      // 🔹 Upload files
      await uploadBytes(kycRef, kycFile);
      await uploadBytes(rateCardRef, rateCardFile);

      // 🔹 Get URLs
      const kycURL = await getDownloadURL(kycRef);
      const rateCardURL = await getDownloadURL(rateCardRef);

      // 🔹 Payload
      const payload = {
        status: "PENDING",
        approvedAt: null,
        approvedBy: null,
        rejectedAt: null,
        rejectedBy: null,
        docId: docRef.id,
        lastUpdatedAt: serverTimestamp(),
        lastUpdatedBy: user.email,
        rejectionReason: null,
        CreatedBy: user.name,
        CreatedByLocation: user.Location,
        CreatedByRole: user.role,
        CreatedByEmail: user.email,
        referenceCode, // 🔒 guaranteed unique
        companyName: data.companyName,
        consignorName: data.consignorName,
        consignorAddress: data.consignorAddress,
        consignorPhone: data.phone,
        pincode: data.pincode,
        city: data.city,
        coordinates: data.coordinates,
        pickupArea: data.pickupArea,
        specialInstructions: data.specialInstructions,

        billingCompanyName: data.billingCompany,
        GSTNumber: data.gst,
        billingAddress: data.billingAddress,
        GSTState: data.gstState,

        shipmentsCommitment: data.shipments,
        volumeCommitment: data.volume,
        frequentCountries: countries,

        kycFileUrl: kycURL,
        rateCardFileUrl: rateCardURL,
        isApproved: false,
        schemaVersion: 1,
        isActive: true,
        createdAt: serverTimestamp(),
        internalNotes: "",
      };

      // 🔹 Save using SAME doc reference
      await setDoc(docRef, payload);
      setCreatedRef(referenceCode);
      setShowSuccess(true);
      reset();
      setCountries([]);
      setCountryInput("");
      window.scrollTo({ top: 0, behavior: "smooth" });

      console.log("✅ Client Onboarding Saved");
    } catch (error) {
      console.error("❌ Error submitting form:", error);
    } finally {
      setLoading(false); // 🔥 stop loading (always)
    }
  };

  const removeCountry = (countryToRemove) => {
    setCountries(countries.filter((c) => c !== countryToRemove));
  };

  const handleAddCountry = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = countryInput.trim();
      if (!value) return;
      if (!countries.includes(value)) {
        setCountries((prev) => [...prev, value]);
      }
      setCountryInput("");
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full">
      <Nav />

      <main className="flex-1 py-10 px-4">
        <div className="max-w-4xl mx-auto bg-white border rounded-xl">
          <div className="p-8 border-b bg-gray-50 rounded-xl">
            <h2 className="text-3xl font-black">Client Onboarding</h2>
            <p className="text-black/60">
              Register a new client for business and billing operations.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-10">
            {/* Pickup Details */}
            <FormSection
              icon={<FaLocationDot />}
              title="Consignor & Pickup Details"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Company Name */}
                <Input
                  label="Company Name"
                  placeholder="Company Name"
                  error={errors.companyName}
                  {...register("companyName", {
                    required: "Company name is required",
                    minLength: {
                      value: 3,
                      message: "Minimum 3 characters required",
                    },
                    pattern: {
                      value: /^[A-Za-z\s]+$/,
                      message: "Only letters and spaces allowed",
                    },
                  })}
                />

                {/* Consignor Name */}
                <Input
                  label="Consignor Name"
                  placeholder="Consignor Name"
                  error={errors.consignorName}
                  {...register("consignorName", {
                    required: "Consignor name is required",
                    minLength: {
                      value: 3,
                      message: "Minimum 3 characters required",
                    },
                    pattern: {
                      value: /^[A-Za-z\s]+$/,
                      message: "Only letters and spaces allowed",
                    },
                  })}
                />

                {/* Address */}
                <Input
                  label="Consignor Address"
                  placeholder="Consignor Address"
                  fullWidth
                  error={errors.consignorAddress}
                  {...register("consignorAddress", {
                    required: "Address is required",
                  })}
                />

                {/* Phone */}
                <Input
                  label="Consignor Phone Number"
                  placeholder="10 digit mobile number"
                  type="text"
                  error={errors.phone}
                  {...register("phone", {
                    required: "Phone number is required",
                    pattern: {
                      value: /^[0-9]{10}$/,
                      message: "Phone number must be exactly 10 digits",
                    },
                  })}
                  maxLength={10}
                  onKeyDown={(e) => {
                    if (
                      !/[0-9]/.test(e.key) &&
                      e.key !== "Backspace" &&
                      e.key !== "Tab"
                    ) {
                      e.preventDefault();
                    }
                  }}
                />

                {/* Pincode */}
                <Input
                  label="Pickup Pincode"
                  placeholder="6 digit pincode"
                  type="text"
                  error={errors.pincode}
                  {...register("pincode", {
                    required: "Pincode is required",
                    pattern: {
                      value: /^[0-9]{6}$/,
                      message: "Pincode must be exactly 6 digits",
                    },
                  })}
                  maxLength={6}
                  onKeyDown={(e) => {
                    if (
                      !/[0-9]/.test(e.key) &&
                      e.key !== "Backspace" &&
                      e.key !== "Tab"
                    ) {
                      e.preventDefault();
                    }
                  }}
                />

                {/* City */}
                <label className="block">
                  <span className="text-sm font-semibold">City</span>
                  <select
                    className={`w-full h-12 px-4 rounded-lg border bg-gray-50 focus:ring-1 focus:ring-[#bf81fd] outline-none ${
                      errors.city ? "border-red-400" : "border-gray-200"
                    }`}
                    {...register("city", { required: "City is required" })}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select City
                    </option>
                    <option value="Chennai">Chennai</option>
                    <option value="Pondy">Pondy</option>
                    <option value="Coimbatore">Coimbatore</option>
                    <option value="Mayiladuthurai">Mayiladuthurai</option>
                  </select>
                  {errors.city && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.city.message}
                    </p>
                  )}
                </label>

                <Input
                  label="Pickup Coordinates (Latitude, Longitude)"
                  placeholder="12.00000 , 11.000123"
                  error={errors.coordinates}
                  {...register("coordinates", {
                    required: "Pickup coordinates are required",
                    pattern: {
                      value: /^\s*-?\d{1,3}\.\d+\s*,\s*-?\d{1,3}\.\d+\s*$/,
                      message: "Format must be: 12.0 , 11.0",
                    },
                  })}
                />

                <Input
                  label="Pickup Area"
                  placeholder="Enter pickup area"
                  error={errors.pickupArea}
                  {...register("pickupArea", {
                    required: "Pickup area is required",
                    minLength: {
                      value: 3,
                      message: "Minimum 3 characters required",
                    },
                    maxLength: {
                      value: 50,
                      message: "Maximum 50 characters allowed",
                    },
                  })}
                />
              </div>
              <Textarea
                label="Special Instructions"
                placeholder="Any pickup-specific instructions..."
                rows={4}
                fullWidth
                error={errors.specialInstructions}
                {...register("specialInstructions", {
                  required: "Special instructions are required",
                  minLength: {
                    value: 10,
                    message: "Minimum 10 characters required",
                  },
                  maxLength: {
                    value: 200,
                    message: "Maximum 200 characters allowed",
                  },
                  validate: (value) =>
                    value.trim().length >= 10 ||
                    "Minimum 10 characters required",
                })}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* KYC Upload */}
                <UploadCard
                  title="Upload KYC Documents"
                  description="Upload company KYC (PDF • Max 2MB)"
                  file={watch("kyc")}
                  error={errors.kyc}
                  accept=".pdf"
                  {...register("kyc", {
                    required: "KYC document is required",
                    validate: {
                      fileType: (files) =>
                        ["application/pdf", "image/jpeg", "image/png"].includes(
                          files?.[0]?.type,
                        ) || "Only PDF files are allowed",
                      fileSize: (files) =>
                        files?.[0]?.size <= 2 * 1024 * 1024 ||
                        "File size must be less than 2 MB",
                    },
                  })}
                />

                <UploadCard
                  title="Upload Rate Card"
                  description="Upload rate card (Excel only • Max 2MB)"
                  file={watch("rateCard")}
                  error={errors.rateCard}
                  accept=".xls,.xlsx"
                  {...register("rateCard", {
                    required: "Rate card is required",
                    validate: {
                      fileType: (files) =>
                        [
                          "application/vnd.ms-excel",
                          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        ].includes(files?.[0]?.type) ||
                        "Only Excel files are allowed",
                      fileSize: (files) =>
                        files?.[0]?.size <= 2 * 1024 * 1024 ||
                        "File size must be less than 2 MB",
                    },
                  })}
                />
              </div>
            </FormSection>

            {/* Billing */}
            <FormSection icon={<MdReceiptLong />} title="Billing Details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Billing Company Name"
                  placeholder="Company Name"
                  fullWidth
                  error={errors.billingCompany}
                  {...register("billingCompany", {
                    required: "Billing company name is required",
                    minLength: {
                      value: 3,
                      message: "Minimum 3 characters required",
                    },
                    maxLength: {
                      value: 60,
                      message: "Maximum 60 characters allowed",
                    },
                    validate: (value) =>
                      value.trim().length >= 3 ||
                      "Minimum 3 characters required",
                  })}
                />

                <Input
                  label="GST Number"
                  placeholder="GSTIN"
                  error={errors.gst}
                  {...register("gst", {
                    required: "GST number required",
                    minLength: {
                      value: 15,
                      message: "GST must be 15 characters",
                    },
                    maxLength: {
                      value: 15,
                      message: "GST must be 15 characters",
                    },
                  })}
                />

                <label className="block md:col-span-2">
                  <span className="text-sm font-semibold">
                    State (GST Registered State)
                  </span>

                  <select
                    className={`w-full h-12 px-4 rounded-lg border bg-gray-50 focus:ring-1 focus:ring-[#bf81fd] outline-none ${
                      errors.gstState ? "border-red-400" : "border-gray-200"
                    }`}
                    {...register("gstState", {
                      required: "GST registered state is required",
                    })}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select GST Registered State
                    </option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Coimbatore">Coimbatore</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                    <option value="Assam">Assam</option>
                    <option value="Bihar">Bihar</option>
                    <option value="Chhattisgarh">Chhattisgarh</option>
                    <option value="Goa">Goa</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Himachal Pradesh">Himachal Pradesh</option>
                    <option value="Jharkhand">Jharkhand</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Manipur">Manipur</option>
                    <option value="Meghalaya">Meghalaya</option>
                    <option value="Mizoram">Mizoram</option>
                    <option value="Nagaland">Nagaland</option>
                    <option value="Odisha">Odisha</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Sikkim">Sikkim</option>
                    <option value="Tripura">Tripura</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Uttarakhand">Uttarakhand</option>
                    <option value="West Bengal">West Bengal</option>
                  </select>
                  {errors.gstState && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.gstState.message}
                    </p>
                  )}
                </label>

                <Input
                  label="GST Address / Billing Address"
                  placeholder="Enter Billing Address"
                  fullWidth
                  error={errors.billingAddress}
                  {...register("billingAddress", {
                    required: "Billing company address is required",
                    minLength: {
                      value: 10,
                      message: "Minimum 10 characters required",
                    },
                    maxLength: {
                      value: 200,
                      message: "Maximum 25 characters allowed",
                    },
                    validate: (value) =>
                      value.trim().length >= 10 ||
                      "Minimum 10 characters required",
                  })}
                />
              </div>
            </FormSection>

            {/* Commitment */}
            <FormSection
              icon={<FaHandshakeSimple />}
              title="Business Commitment"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Shipments / Month"
                  type="number"
                  placeholder="Enter your monthly shipment commitment"
                  error={errors.shipments}
                  {...register("shipments", {
                    required: "Monthly shipment commitment Required",
                    min: { value: 1, message: "Must be at least 1" },
                    valueAsNumber: true,
                  })}
                  min={1}
                />

                <Input
                  label="Volume / Month (KG)"
                  type="number"
                  placeholder="Enter your monthly volume commitment."
                  error={errors.volume}
                  {...register("volume", {
                    required: "Monthly volume commitment Required",
                    min: { value: 1, message: "Must be at least 1" },
                    valueAsNumber: true,
                  })}
                  min={1}
                />

                <div className="md:col-span-2">
                  <span className="text-sm font-semibold mb-2 block">
                    Frequently shipped countries
                  </span>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {countries.map((country) => (
                      <Tag
                        key={country}
                        label={country}
                        onRemove={() => removeCountry(country)}
                      />
                    ))}
                  </div>

                  <input
                    value={countryInput}
                    onChange={(e) => setCountryInput(e.target.value)}
                    onKeyDown={handleAddCountry}
                    placeholder="Type country name and press Enter"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg h-12 px-4 focus:ring-2 focus:ring-[#bf81fd] outline-none"
                  />
                  <p className="text-red-500 text-xs mt-3 text-start">
                    {countries.length == 0 ? "Countries are required" : ""}
                  </p>
                </div>
              </div>
            </FormSection>
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2
    ${
      loading
        ? "bg-[#bf81fd]/70 cursor-not-allowed"
        : "bg-[#bf81fd] hover:brightness-110"
    } text-white
  `}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <Lottie
                    animationData={animationData}
                    loop={true}
                    style={{ width: 24, height: 24 }}
                  />
                </div>
              ) : (
                <>
                  <FaUserPlus className="inline" />
                  Create Client Profile
                </>
              )}
            </button>
          </form>
        </div>
        {showSuccess && (
          <SuccessModal
            referenceCode={createdRef}
            onClose={() => setShowSuccess(false)}
          />
        )}
      </main>
    </div>
  );
};

/* ---------------- Sub Components ---------------- */

const Input = React.forwardRef(({ label, error, fullWidth, ...props }, ref) => (
  <label className={`block ${fullWidth ? "md:col-span-2" : ""}`}>
    <span className="text-sm font-semibold">{label}</span>
    <input
      ref={ref}
      {...props}
      className={`w-full h-12 px-4 rounded-lg border bg-gray-50 focus:ring-1 focus:ring-[#bf81fd] outline-none ${
        error ? "border-red-400" : "border-gray-200"
      }`}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error.message}</p>}
  </label>
));

const FormSection = ({ icon, title, children }) => (
  <section>
    <div className="flex items-center gap-2 mb-6 border-b pb-4">
      <span className="text-[#bf81fd] text-xl">{icon}</span>
      <h3 className="text-xl font-bold">{title}</h3>
    </div>
    {children}
  </section>
);

const Tag = ({ label, onRemove }) => (
  <span className="bg-[#bf81fd]/20 px-3 py-1 rounded-full text-xs flex items-center gap-1">
    {label}
    <FaXmark className="cursor-pointer" onClick={onRemove} />
  </span>
);

const Textarea = React.forwardRef(
  ({ label, error, fullWidth, ...props }, ref) => (
    <label className={`pt-6 block ${fullWidth ? "md:col-span-2" : ""}`}>
      <span className="text-sm font-semibold">{label}</span>

      <textarea
        ref={ref}
        {...props}
        className={`w-full px-4 py-3 rounded-lg border bg-gray-50 focus:ring-1 focus:ring-[#bf81fd] outline-none resize-none ${
          error ? "border-red-400" : "border-gray-200"
        }`}
      />

      {error && <p className="text-red-500 text-xs mt-1">{error.message}</p>}
    </label>
  ),
);

const UploadCard = React.forwardRef(
  ({ title, description, error, accept, file, ...props }, ref) => {
    const selectedFile = file?.[0];

    return (
      <label className="block border-2 border-dashed rounded-xl p-6 bg-gray-50 cursor-pointer hover:border-[#bf81fd] transition">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-full bg-[#bf81fd]/20 flex items-center justify-center text-[#bf81fd] font-bold">
            ⬆
          </div>

          <h4 className="font-semibold">{title}</h4>
          <p className="text-xs text-black/60">{description}</p>

          <input
            ref={ref}
            type="file"
            accept={accept}
            className="hidden"
            {...props}
          />

          {!selectedFile && (
            <span className="text-xs text-[#bf81fd] font-medium">
              Click to upload
            </span>
          )}

          {selectedFile && !error && (
            <div className="mt-2 text-xs text-green-600 font-medium">
              ✅ {selectedFile.name} <br />
              <span className="text-black/50">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </span>
            </div>
          )}
        </div>

        {error && (
          <p className="text-red-500 text-xs mt-3 text-center">
            {error.message}
          </p>
        )}
      </label>
    );
  },
);

const SuccessModal = ({ referenceCode, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center animate-scaleIn">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-3xl">
          ✓
        </div>

        <h2 className="text-2xl font-bold mb-2">Client Profile Created</h2>

        <p className="text-black/60 mb-4">
          The client onboarding request has been submitted successfully.
        </p>

        <div className="bg-gray-50 border rounded-lg p-3 mb-6">
          <p className="text-xs text-black/50">Reference Code</p>
          <p className="font-mono font-bold text-lg text-[#bf81fd]">
            {referenceCode}
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl font-bold bg-[#bf81fd] text-white hover:brightness-110 transition"
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default ClientOnboarding;
