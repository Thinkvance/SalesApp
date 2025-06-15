import { Controller } from "react-hook-form";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

function ConsigneePhoneNumberInput({ control, errors }) {
  return (
    <div className="mb-4">
      <label className="block text-gray-700 font-semibold mb-2">
        Consignee Phone Number:
        <span className="ml-2 text-sm font-normal text-red-500 ">
          Enter without country code
        </span>
      </label>
      <Controller
        name="countrycode"
        control={control}
        render={({ field }) => (
          <div className="flex ">
            <PhoneInput
              enableSearch
              value={field.value}
              onChange={(value) => field.onChange(value)}
              inputStyle={{
                width: "100px",
                borderColor: errors.consigneenumber ? "#f87171" : "#d1d5db",
                borderRadius: "0.375rem",
                fontSize: "1rem",
              }}
              inputProps={{
                readOnly: true,
                disabled: true,
              }}
              buttonStyle={{
                pointerEvents: "none", // disables flag click
                backgroundColor: "#f3f4f6",
                cursor: "not-allowed",
              }}
              containerStyle={{ width: "100%" }}
              specialLabel=""
            />
            <input type="text" className="w-full" />
          </div>
        )}
      />
      {errors.countrycode && (
        <p className="text-red-500 text-sm mt-1">
          {errors.consigneenumber.message}
        </p>
      )}
    </div>
  );
}

export default ConsigneePhoneNumberInput;
