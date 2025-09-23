import React from "react";
import appVersion from "../functions/appVersion";

/**
 * ProfileModal.jsx
 * A reusable Profile component shown as a popup modal.
 * - Tailwind CSS (expected in the project)
 *
 * Example usage:
 *  const [open, setOpen] = useState(false);
 *  const user = { name: 'Dinesh', email: 'dinesh@gmail.com', role: 'Manager', avatar: '/avatar.png', version: '1.0.0' };
 *  <ProfileModal open={open} setOpen={setOpen} user={user} />
 */

export default function ProfileModal({ open, setOpen, user = {} }) {
  if (!open) return null;
  // Get login data from localStorage
  const storedUser = JSON.parse(localStorage.getItem("LoginCredentials")) || {};
  const {
    name = "Unknown",
    email = "—",
    role = "—",
    avatar = null,
    version = appVersion?.appversion,
  } = storedUser;

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:px-6"
      aria-modal="true"
      role="dialog"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" />

      {/* Modal Panel */}
      <div
        className="relative z-10 max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-200 scale-100"
        onClick={(e) => e.stopPropagation()} // prevent close when clicking inside
        role="document"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={`${name} avatar`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-semibold text-purple-600">
                    {(name || "?").charAt(0)?.toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {name?.toUpperCase()}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {role}
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setOpen(false)}
              className="ml-3 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
              aria-label="Close profile"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-600 dark:text-gray-300"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {/* Details */}
          <div className="mt-6 space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-purple-600"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M2 5a2 2 0 012-2h1.5a.5.5 0 01.5.5V5h6V3.5a.5.5 0 01.5-.5H16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
              </svg>
              <span className="truncate">{email}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 tracking-wide">
              App Version: <span className="text-green-500">{version}</span>
            </span>

            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 focus:outline-none"
              >
                Close
              </button>

              <button className="px-4 py-2 cursor-not-allowed rounded-lg bg-purple-600 text-white shadow-sm hover:bg-purple-700 focus:outline-none">
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
