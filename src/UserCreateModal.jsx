import { useForm } from "react-hook-form";
import { useState } from "react";
import { IoMdEye } from "react-icons/io";
import { IoMdEyeOff } from "react-icons/io";

export default function UserCreateModal({ isOpen, onClose }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleFormSubmit = async (data) => {
    setApiError("");
    setIsSubmitting(true);

    const payload = {
      email: data.email,
      password: data.password,
      displayName: data.name,
      Role: data.role,
      City: data.city,
    };

    try {
      const response = await fetch("http://localhost:3000/create-user", {
        method: "POST",
        headers: {
          Authorization:
            "Bearer 39dd3954c00c5132153c267a818a08c22d80931a8a5a8ac12facf18964066456",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Failed to create user");
      }

      reset();
      onClose();
    } catch (error) {
      setApiError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3">
      <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-6 relative">
        {/* Header */}
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Create User
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-gray-600">Name</label>
            <input
              className="w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              {...register("name", { required: "Name is required" })}
              placeholder="Enter full name"
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-medium text-gray-600">
              Email ID
            </label>
            <input
              type="email"
              className="w-full mt-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[a-zA-Z0-9._%+-]+@shiphit\.in$/,
                  message: "Email must be @shiphit.in domain",
                },
              })}
              placeholder="name@shiphit.in"
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password with Eye Toggle */}
          <div>
            <label className="text-sm font-medium text-gray-600">
              Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full mt-1 px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 6,
                    message: "Minimum 6 characters required",
                  },
                })}
                placeholder="••••••••"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showPassword ? <IoMdEyeOff /> : <IoMdEye />}
              </button>
            </div>

            {errors.password && (
              <p className="text-xs text-red-500 mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="text-sm font-medium text-gray-600">Role</label>
            <select
              className="w-full mt-1 px-3 py-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              {...register("role", { required: "Role is required" })}
            >
              <option value="">Select role</option>
              <option value="sales associate">Sales Associate</option>
              <option value="Manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            {errors.role && (
              <p className="text-xs text-red-500 mt-1">{errors.role.message}</p>
            )}
          </div>

          {/* City */}
          <div>
            <label className="text-sm font-medium text-gray-600">City</label>
            <select
              className="w-full mt-1 px-3 py-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              {...register("city", { required: "City is required" })}
            >
              <option value="">Select city</option>
              <option value="CHENNAI">CHENNAI</option>
            </select>
            {errors.city && (
              <p className="text-xs text-red-500 mt-1">{errors.city.message}</p>
            )}
          </div>

          {/* API Error */}
          {apiError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {apiError}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm rounded-md border hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 text-sm rounded-md text-white
                ${
                  isSubmitting
                    ? "bg-purple-400 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700"
                }`}
            >
              {isSubmitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
