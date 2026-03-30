// Nav.jsx
import { Avatar, Menu, MenuItem } from "@mui/material";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { auth, db } from "./firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import utility from "./Utility/utilityFunctions";
import ProfileModal from "./components/ProfileModal";

function Nav() {
  const location = useLocation();
  const [user, setUser] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pickupAnchorEl, setPickupAnchorEl] = useState(null);
  const [rateAnchorEl, setRateAnchorEl] = useState(null);
  const [reportsAnchorEl, setReportsAnchorEl] = useState(null);
  const [RoleBasedScreens, setRoleBasedScreens] = useState({});
  const [Open, setOpen] = useState(false);

  // 🔹 Manager + Sales Admin pending count for Escalations
  const [pendingCount, setPendingCount] = useState(0);

  function roleFormate(role) {
    return role
      ?.split(" ")
      ?.map(
        (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      )
      ?.join(" ");
  }

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("LoginCredentials"));
    console.log("user", u);
    setUser(u);
    setRoleBasedScreens(utility.rolesPermissions());
  }, []);

  // normalize role checks
  const roleLower = (user?.role || "").toLowerCase();
  const shouldShowEscalationsNav =
    roleLower === "manager" || roleLower === "sales admin";

  // 🔹 Subscribe to pending escalations (Manager OR Sales Admin)
  useEffect(() => {
    if (!shouldShowEscalationsNav) return;
    const qRef = query(
      collection(db, "ecalatoins"),
      where("escalationStatus", "==", "pending"),
    );
    const unsub = onSnapshot(
      qRef,
      (snap) => setPendingCount(snap.size || 0),
      () => setPendingCount(0),
    );
    return () => unsub();
  }, [shouldShowEscalationsNav]);

  const handlePickupMenuOpen = (event) =>
    setPickupAnchorEl(event.currentTarget);
  const handlePickupMenuClose = () => setPickupAnchorEl(null);
  const handleRateMenuOpen = (event) => setRateAnchorEl(event.currentTarget);
  const handleRateMenuClose = () => setRateAnchorEl(null);
  const handleReportsMenuOpen = (event) =>
    setReportsAnchorEl(event.currentTarget);
  const handleReportsMenuClose = () => setReportsAnchorEl(null);

  const isActive = (path) =>
    location.pathname.toLowerCase().startsWith(path.toLowerCase());

  return (
    <nav className="sticky top-0 z-40 flex items-center justify-between bg-white p-2 shadow-md">
      <div className=" px-6 flex container mx-auto justify-between">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <Link to="/">
            <img src="/logo.png" className="h-8 sm:h-10" alt="Logo" />
          </Link>

          {/* Desktop Nav */}
          <ul className="hidden lg:flex space-x-8 items-center">
            {/* Pickup Management */}
            {RoleBasedScreens.PickupManagement && (
              <li>
                <button
                  onClick={handlePickupMenuOpen}
                  className="text-black flex items-center gap-1 font-medium"
                >
                  Pickup Management
                  <ArrowDropDownIcon />
                </button>
                <Menu
                  anchorEl={pickupAnchorEl}
                  open={Boolean(pickupAnchorEl)}
                  onClose={handlePickupMenuClose}
                >
                  {RoleBasedScreens?.PickupManagement?.map((d) => (
                    <MenuItem
                      key={d}
                      onClick={handlePickupMenuClose}
                      component={Link}
                      to={`/${d}`}
                    >
                      {utility.formatRouteName(d)}
                    </MenuItem>
                  ))}
                </Menu>
              </li>
            )}

            {/* Rate Management */}
            {RoleBasedScreens.RateManagement && (
              <li>
                <button
                  onClick={handleRateMenuOpen}
                  className="text-black flex items-center gap-1 font-medium"
                >
                  Rate Management
                  <ArrowDropDownIcon />
                </button>
                <Menu
                  anchorEl={rateAnchorEl}
                  open={Boolean(rateAnchorEl)}
                  onClose={handleRateMenuClose}
                >
                  {RoleBasedScreens?.RateManagement?.map((d) => (
                    <MenuItem
                      key={d}
                      onClick={handleRateMenuClose}
                      component={Link}
                      to={`/${d}`}
                      className={`${isActive(`/${d}`) ? "text-purple-900" : "text-gray-700"}`}
                    >
                      {utility.formatRouteName(d)}
                    </MenuItem>
                  ))}
                </Menu>
              </li>
            )}

            {/* Reports Section */}
            {[
              "manager",
              "sales admin",
              "sales associate",
              "accountant",
            ].includes(roleLower) && (
              <li>
                <button
                  onClick={handleReportsMenuOpen}
                  className="text-black flex items-center gap-1 font-medium"
                >
                  Reports
                  <ArrowDropDownIcon />
                </button>
                <Menu
                  anchorEl={reportsAnchorEl}
                  open={Boolean(reportsAnchorEl)}
                  onClose={handleReportsMenuClose}
                >
                  {RoleBasedScreens?.Reports?.map((d) => (
                    <MenuItem
                      key={d}
                      onClick={handleReportsMenuClose}
                      component={Link}
                      to={`/${d}`}
                      className={`${isActive(`/${d}`) ? "text-purple-900" : "text-gray-700"}`}
                    >
                      {utility.formatRouteName(d)}
                    </MenuItem>
                  ))}
                </Menu>
              </li>
            )}

            {/* My Shipments */}
            {user.role != "Accountant" && (
              <li>
                <Link
                  to="/My-Shipments"
                  className={`text-black font-medium transition-all ${
                    isActive("/My-Shipments") ? "" : ""
                  }`}
                >
                  My Shipments
                </Link>
              </li>
            )}

            {/* 🔹 Escalations (Manager OR Sales Admin) */}
            {shouldShowEscalationsNav && (
              <li>
                <Link
                  to="/escalations"
                  className={`text-black font-medium transition-all ${
                    isActive("/escalations") ? "" : ""
                  }`}
                >
                  Escalations
                  {pendingCount > 0 && (
                    <span className="ml-0 inline-flex items-center justify-center rounded-full bg-white/30 text-[#7447D4] text-[12px] font-semibold px-1 py-0.6">
                      ({pendingCount})
                    </span>
                  )}
                </Link>
              </li>
            )}
          </ul>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-6 rounded-lg">
          {/* Mobile toggle */}
          <button
            className="lg:hidden block text-[#7447D4]"
            onClick={() => setSidebarOpen(true)}
          >
            <MenuIcon fontSize="large" />
          </button>

          <Avatar
            onClick={() => setOpen(true)}
            sx={{ width: 35, height: 35, fontSize: 14, cursor: "pointer" }}
            className="cursor-pointer text-white h-5 w-8 text-lg font-semibold"
          >
            {user?.name?.[0]?.toUpperCase() || "?"}
          </Avatar>
        </div>

        {/* Mobile Sidebar */}
        <div
          className={`fixed top-0 left-0 h-full w-64 bg-white z-20 transform ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } transition-transform duration-300 ease-in-out shadow-lg`}
        >
          <div className="flex justify-between items-center p-4 bg-[#7447D4]">
            <h2 className="text-white font-bold text-lg">Menu</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-white hover:text-gray-200"
            >
              <CloseIcon />
            </button>
          </div>

          <ul className="flex flex-col p-4 space-y-2">
            {RoleBasedScreens?.PickupManagement?.map((d) => (
              <li key={d}>
                <Link
                  to={`/${d}`}
                  className={`py-2 px-4 text-gray-700 rounded-lg block ${
                    isActive(`/${d}`)
                      ? "bg-purple-100 text-purple-800"
                      : "hover:bg-purple-200"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  {utility.formatRouteName(d)}
                </Link>
              </li>
            ))}

            {RoleBasedScreens?.RateManagement?.map((d) => (
              <li key={d}>
                <Link
                  to={`/${d}`}
                  className={`py-2 px-4 text-gray-700 rounded-lg block ${
                    isActive(`/${d}`)
                      ? "bg-purple-100 text-purple-800"
                      : "hover:bg-purple-200"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  {utility.formatRouteName(d)}
                </Link>
              </li>
            ))}

            {[
              "manager",
              "sales admin",
              "sales associate",
              "accountant",
            ].includes(roleLower) &&
              RoleBasedScreens?.Reports?.map((d) => (
                <li key={d}>
                  <Link
                    to={`/${d}`}
                    className={`py-2 px-4 text-gray-700 rounded-lg block ${
                      isActive(`/${d}`)
                        ? "bg-purple-100 text-purple-800"
                        : "hover:bg-purple-200"
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {utility.formatRouteName(d)}
                  </Link>
                </li>
              ))}

            <li>
              <Link
                to="/My-Shipments"
                className={`py-2 px-4 text-gray-700 rounded-lg block ${
                  isActive("/My-Shipments")
                    ? "bg-purple-100 text-purple-800"
                    : "hover:bg-purple-200"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                My Shipments
              </Link>
            </li>

            {/* 🔹 Escalations (Manager OR Sales Admin) */}
            {shouldShowEscalationsNav && (
              <li>
                <Link
                  to="/escalations"
                  className={`py-2 px-4 text-gray-700 rounded-lg flex items-center justify-between ${
                    isActive("/escalations")
                      ? "bg-purple-100 text-purple-800"
                      : "hover:bg-purple-200"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span>Escalations</span>
                  {pendingCount > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center rounded-full bg-[#7447D4] text-white text-[11px] font-semibold px-2 py-0.5">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              </li>
            )}
          </ul>
        </div>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black opacity-50 z-10"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>

      <ProfileModal
        open={Open}
        setOpen={setOpen}
        user={{
          name: user?.name || "User",
          email: user?.email || "user@example.com",
          role: roleFormate(user?.role) || "Role",
        }}
      />
    </nav>
  );
}

export default Nav;
