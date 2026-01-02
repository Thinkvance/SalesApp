import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VpnKeyOutlinedIcon from "@mui/icons-material/VpnKeyOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Navigate } from "react-router-dom";
import { db } from "./firebase";
import { Menu, MenuItem } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import axios from "axios";
import Nav from "./Nav";
import UserCreateModal from "./UserCreateModal";

/* ===============================
   CONFIG
================================ */
const ROLE_BADGE = {
  manager: "bg-purple-100 text-purple-700",
  "sales admin": "bg-indigo-100 text-indigo-700",
  "ops head": "bg-blue-100 text-blue-700",
  "sales executive": "bg-green-100 text-green-700",
  "pickup executive": "bg-orange-100 text-orange-700",
};

/* ===============================
   MOBILE LIST — CLEAN (NO OVERLAY)
================================ */
const MobileUserList = ({
  users = [],
  currentEmail,
  onMenu,
  getUserDetailsByEmailId,
  loading,
}) => {
  return (
    <div className="md:hidden space-y-3">
      {loading ? (
        <div className="p-10 text-center text-gray-500">Loading users…</div>
      ) : (
        <>
          {users?.map((user) => {
            const isSelf = user.email === currentEmail;

            return (
              <div
                key={user.email}
                className="flex overflow-hidden rounded-xl border bg-white"
              >
                {/* CONTENT AREA (SWIPEABLE) */}
                <div className="flex-1 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
                  <div className="flex w-[200%]">
                    {/* PANEL 1 — BASIC INFO */}
                    <div className="w-full snap-start px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-purple-600 text-white flex items-center justify-center font-semibold">
                          {user.email?.[0]?.toUpperCase()}
                        </div>

                        <div className="leading-tight">
                          <div className="text-sm font-semibold text-gray-900">
                            {getUserDetailsByEmailId(user.email).name
                              ? getUserDetailsByEmailId(user.email).name
                              : "-"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {user.email}
                            {isSelf && (
                              <span className="ml-1 text-purple-500">
                                (You)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PANEL 2 — DETAILS */}
                    <div className="w-full snap-start px-4 py-3 bg-gray-50">
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <div className="text-gray-400">Access</div>
                          <div className="font-medium capitalize text-gray-800">
                            {getUserDetailsByEmailId(user?.email)["role"]}
                          </div>
                        </div>

                        <div>
                          <div className="text-gray-400">Last Active</div>
                          <div className="font-medium text-gray-800">
                            {user.lastLogin || "—"}
                          </div>
                        </div>

                        <div>
                          <div className="text-gray-400">Joined</div>
                          <div className="font-medium text-gray-800">
                            {user.createdAt || "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ACTION RAIL (FIXED, NEVER OVERLAPS) */}
                {user.email !== currentEmail && user.role !== "manager" && (
                  <div className="w-12 flex items-center justify-center border-l bg-white">
                    <button
                      // onClick={(e) => onMenu(e, user)}
                      className="text-gray-400 hover:text-gray-700"
                    >
                      <MoreVertIcon fontSize="small" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

export default function UserManagement() {
  const stored = JSON.parse(localStorage.getItem("LoginCredentials") || "{}");
  const currentEmail = stored?.email;
  const currentRole = (stored?.role || "").toLowerCase();
  const [open, setOpen] = useState(false);

  const [users, setUsers] = useState([]);
  const [ListOfUserInDB, setListOfUserInDB] = useState([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pendingChange, setPendingChange] = useState(null);
  const [saving, setSaving] = useState(false);

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuUser, setMenuUser] = useState(null);

  /* ===============================
     FETCH USERS
  ================================ */
  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, "LoginCredentials"));
      const list = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        Object.keys(data).forEach((email) => {
          const u = data[email];
          if (!u) return;
          list.push({
            docId: docSnap.id,
            name: u[0],
            email: u[1],
            role: u[2],
            city: u[3],
          });
        });
      });
      setListOfUserInDB(list);
      await axios
        .get("http://localhost:3000/auth-users", {
          headers: {
            Authorization:
              "Bearer 39dd3954c00c5132153c267a818a08c22d80931a8a5a8ac12facf18964066456",
            "Content-Type": "application/json",
          },
        })
        .then((response) => {
          setUsers(response.data);
        })
        .catch((error) => {
          console.error("Error:", error.response?.data || error.message);
        });
      setLoading(false);
    };

    fetchUsers();
  }, []);

  function getUserDetailsByEmailId(emailId) {
    return ListOfUserInDB.find((user) => user.email == emailId);
  }

  return (
    <div>
      <Nav />
      <div className="container mx-auto rounded-lg bg-gradient-to-br  px-4 md:px-8 py-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl md:text-3xl font-bold text-purple-600">
            User Management
          </h1>
          <p className="text-sm text-gray-500">
            Control access, roles, and permissions
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 mb-5 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-medium text-gray-700">
            All Users{" "}
            <span className="ml-1 rounded-full bg-purple-100 px-3 py-1 text-purple-600 font-semibold">
              {users.total ? users.total : "-"}
            </span>
          </div>

          <div className="flex gap-3">
            <input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-64 rounded-xl border px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-200"
            />
            <button
              onClick={() => setOpen((prev) => !prev)}
              className="rounded-xl bg-purple-600 px-5 text-nowrap py-2 text-sm font-semibold text-white"
            >
              + Add user
            </button>
          </div>
        </div>

        {/* MOBILE */}
        <MobileUserList
          users={users.users}
          currentEmail={currentEmail}
          onMenu={(e, user) => {
            setMenuAnchor(e.currentTarget);
            setMenuUser(user);
          }}
          getUserDetailsByEmailId={getUserDetailsByEmailId}
          loading={loading}
        />

        {/* DESKTOP */}
        <div className="hidden md:block overflow-hidden rounded-2xl bg-white shadow-xl border">
          {loading ? (
            <div className="p-10 text-center text-gray-500">Loading users…</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-purple-200 border-b">
                <tr className="text-xs uppercase text-gray-600">
                  <th className="px-8 py-4 text-left">User Name</th>
                  <th className="px-6 py-4 text-left">Role</th>
                  <th className="px-6 py-4 text-left">Last Active</th>
                  <th className="px-6 py-4 text-left">Created At</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y">
                {users?.users?.map((user) => (
                  <tr key={user.email} className="hover:bg-purple-50">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-11 w-11 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                          {user.email?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold">
                            {getUserDetailsByEmailId(user.email).name
                              ? getUserDetailsByEmailId(user.email).name
                              : "-"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {user.email}
                            {user.email === currentEmail && (
                              <span className="ml-1 text-purple-500">
                                (You)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5 align-middle">
                      <div className="flex items-center h-full">
                        <span
                          className={`inline-flex items-center rounded-full px-1 py-1 text-xs font-semibold capitalize ${
                            ROLE_BADGE[user?.role]
                          }`}
                        >
                          {getUserDetailsByEmailId(user?.email)["role"]}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-5 text-gray-600">
                      {user?.lastLogin}
                    </td>

                    <td className="px-6 py-5 text-gray-600">
                      {user?.createdAt}
                    </td>

                    <td className="px-4 py-5 text-right">
                      <button
                      // onClick={(e) => {
                      //   setMenuAnchor(e.currentTarget);
                      //   setMenuUser(user);
                      // }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* MENU */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
          PaperProps={{
            elevation: 0,
            className:
              "rounded-2xl border border-gray-200 shadow-lg mt-2 min-w-[220px]",
          }}
        >
          {/* Edit details */}
          <MenuItem
            onClick={() => {
              // your existing edit handler
              setMenuAnchor(null);
            }}
            className="flex items-center gap-3 py-3 text-gray-700 hover:bg-gray-50"
          >
            <EditOutlinedIcon fontSize="small" className="text-gray-500" />
            <span className="text-sm font-medium">Edit details</span>
          </MenuItem>

          {/* Change role */}
          <MenuItem
            onClick={() => {
              setPendingChange({ user: menuUser, newRole: menuUser.role });
              setMenuAnchor(null);
            }}
            className="flex items-center gap-3 py-3 text-gray-700 hover:bg-gray-50"
          >
            <VpnKeyOutlinedIcon fontSize="small" className="text-gray-500" />
            <span className="text-sm font-medium">Change Role</span>
          </MenuItem>

          {/* Divider */}
          <div className="my-1 h-px bg-gray-200" />

          {/* Delete user */}
          <MenuItem
            onClick={() => {
              handleDeleteUser(menuUser);
              setMenuAnchor(null);
            }}
            className="flex items-center gap-3 py-3 text-red-600 hover:bg-red-50"
          >
            <DeleteOutlineOutlinedIcon fontSize="small" />
            <span className="text-sm font-medium flex-1">Delete user</span>

            {/* Warning dot */}
            <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />
          </MenuItem>
        </Menu>
      </div>
      <UserCreateModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSubmit={(data) => console.log(data)}
      />
    </div>
  );
}
