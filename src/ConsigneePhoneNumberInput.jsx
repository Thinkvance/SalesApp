import { Controller } from "react-hook-form";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

function ConsigneePhoneNumberInput({ control, errors, register }) {
  return (
    <div className="mb-4">
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
                width: "108px",
                height: "42px",
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
              specialLabel=""
            />
          </div>
        )}
      />
      {errors.countrycode && (
        <p className="text-red-500 text-sm mt-1">
          {errors.countrycode.message}
        </p>
      )}
    </div>
  );
}

export default ConsigneePhoneNumberInput;
