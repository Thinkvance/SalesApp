import { useForm } from "react-hook-form";
import Lottie from "lottie-react";
import loadingAnimation from "./assets/loading_animation.json";
import { useEffect, useState } from "react";
import utilityFunctions from "./Utility/utilityFunctions";
import vendorList from "./DB/vendorList.js";

// Reusable InputField component
const InputField = ({ label, name, register, error, rules }) => (
  <div>
    <label className="block text-sm text-gray-600 mb-1">{label}</label>
    <input
      type="text"
      {...register(name, rules)}
      className={`w-full px-3 py-2 border rounded-md focus:outline-none ${
        error ? "border-red-500" : "border-gray-300 focus:border-purple-500"
      }`}
    />
    {error && <p className="text-red-500 text-sm mt-1">{error.message}</p>}
  </div>
);

// Reusable SelectField component
const SelectField = ({ label, name, register, error, options, rules }) => (
  <div>
    <label className="block text-sm text-gray-600 mb-1">{label}</label>
    <select
      {...register(name, rules)}
      className={`w-full px-3 py-2 border rounded-md focus:outline-none ${
        error ? "border-red-500" : "border-gray-300 focus:border-purple-500"
      }`}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
    {error && <p className="text-red-500 text-sm mt-1">{error.message}</p>}
  </div>
);

// Main Modal Component
const EditShipmentModal = ({
  pickup,
  onChange,
  onClose,
  onSave,
  loadingEdit,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      consignorname: pickup?.consignorname || "",
      service: pickup?.service || "",
      vendorName: pickup?.vendorName || "",
      actualWeight: pickup?.actualWeight || "",
      logisticCost: pickup?.logisticCost || "",
      vendorAwbnumber: pickup?.vendorAwbnumber || "",
      internalWeight: pickup?.internalWeight || "",
    },
  });
  const onSubmit = (data) => {
    onChange({ ...data, awbNumber: pickup.awbNumber });
    onSave({ ...data, awbNumber: pickup.awbNumber });
  };

  if (!pickup) return null;

  const [user, setUser] = useState({});
  const [RoleBasedScreens, setRoleBasedScreens] = useState({});

  useEffect(() => {
    setUser(JSON.parse(localStorage.getItem("LoginCredentials")));
    setRoleBasedScreens(utilityFunctions.rolesPermissions());
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-2xl rounded-lg p-6 shadow-lg relative">
        <h2 className="text-xl font-semibold mb-4 text-purple-700">
          Edit Shipment Details
        </h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Consignor Name"
              name="consignorname"
              register={register}
              rules={{ required: "Consignor name is required." }}
              error={errors.consignorname}
            />
            <SelectField
              label="Service"
              name="service"
              register={register}
              rules={{ required: "Please select a service." }}
              options={["Express", "Economy", "Duty Free"]}
              error={errors.service}
            />

            {pickup.vendorName && (
              <SelectField
                label="Vendor Name"
                name="vendorName"
                register={register}
                rules={{ required: "Please select a vendor." }}
                options={vendorList}
                error={errors.vendorName}
              />
            )}

            {pickup.actualWeight && ["Manager"].includes(user?.role) ? (
              <InputField
                label="Final Weight"
                name="actualWeight"
                register={register}
                rules={{ required: "Final weight is required." }}
                error={errors.actualWeight}
              />
            ) : (
              ""
            )}

            {pickup.internalWeight && ["Manager"].includes(user?.role) ? (
              <InputField
                label="Internal Weight"
                name="internalWeight"
                register={register}
                rules={{ required: "Internal Weight is required." }}
                error={errors.internalWeight}
              />
            ) : (
              ""
            )}

            {pickup.vendorAwbnumber &&
            ["OPS Head", "Manager"].includes(user?.role) ? (
              <InputField
                label="vendorAwbnumber"
                name="vendorAwbnumber"
                register={register}
                rules={{ required: "vendorAwbnumber required." }}
                error={errors.vendorAwbnumber}
              />
            ) : (
              ""
            )}
            {pickup.logisticCost && user?.role == "sales admin" ? (
              <InputField
                label="Logistic Cost"
                name="logisticCost"
                register={register}
                rules={{ required: "Logistic Cost is required." }}
                error={errors.logisticCost}
              />
            ) : (
              ""
            )}
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 flex items-center justify-center min-w-[140px]"
            >
              {loadingEdit ? (
                <Lottie
                  animationData={loadingAnimation}
                  loop
                  autoplay
                  style={{ height: 30, width: 30 }}
                />
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditShipmentModal;
