import { useEffect, useState } from "react";

/* ✅ FINAL Phone Normalizer */
const normalizePhone = (number) => {
  if (!number) return null;

  const parts = number.trim().split(" ");

  if (parts.length > 1 && parts[0].startsWith("+")) {
    return parts.slice(1).join("").replace(/\D/g, "");
  }

  return number.replace(/\D/g, "");
};

const loadFirestore = async () => {
  const { db } = await import("./firebase");
  const firestore = await import("firebase/firestore");

  return {
    db,
    collection: firestore.collection,
    getDocs: firestore.getDocs,
    doc: firestore.doc,
    updateDoc: firestore.updateDoc,
  };
};

export default function WebsiteLeads() {
  const [activeTab, setActiveTab] = useState("today");
  const [todayLeads, setTodayLeads] = useState([]);
  const [historyLeads, setHistoryLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchEnquiries = async () => {
      try {
        const { db, collection, getDocs } = await loadFirestore();

        const snapshot = await getDocs(collection(db, "enquiries"));
        const allData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        /* ✅ Remove Duplicate Leads */
        const uniqueMap = new Map();

        allData.forEach((item) => {
          const normalized = normalizePhone(item.WhatsApp_Number);

          if (!normalized) return;

          if (!uniqueMap.has(normalized)) {
            uniqueMap.set(normalized, item);
          }
        });

        const uniqueLeads = Array.from(uniqueMap.values());

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const todayList = [];
        const historyList = [];

        uniqueLeads.forEach((item) => {
          if (!item.dateTime?.seconds) {
            historyList.push(item);
            return;
          }

          const time = new Date(item.dateTime.seconds * 1000);

          if (time >= startOfDay && time <= endOfDay) {
            todayList.push(item);
          } else {
            historyList.push(item);
          }
        });

        todayList.sort((a, b) => b.dateTime?.seconds - a.dateTime?.seconds);
        historyList.sort((a, b) => b.dateTime?.seconds - a.dateTime?.seconds);

        setTodayLeads(todayList);
        setHistoryLeads(historyList);
        setFilteredLeads(todayList);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching enquiries:", error);
        setLoading(false);
      }
    };

    fetchEnquiries();
  }, []);

  /* ✅ Lead Status Update */
  const handleStatusChange = async (leadId, newStatus) => {
    try {
      setSavingId(leadId);

      const { db, doc, updateDoc } = await loadFirestore();
      const leadRef = doc(db, "enquiries", leadId);

      await updateDoc(leadRef, {
        leadStatus: newStatus,
      });

      /* ✅ Instant UI Update */
      setFilteredLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId ? { ...lead, leadStatus: newStatus } : lead,
        ),
      );

      setToast({ type: "success", message: "Lead updated ✅" });
    } catch (error) {
      console.error("Update failed:", error);
      setToast({ type: "error", message: "Update failed ❌" });
    } finally {
      setSavingId(null);
      setTimeout(() => setToast(null), 2500);
    }
  };

  const handleDateRangeSearch = (start, end) => {
    if (!start && !end) {
      setFilteredLeads(activeTab === "today" ? todayLeads : historyLeads);
      return;
    }

    const startTime = start ? new Date(start) : null;
    const endTime = end ? new Date(end) : null;

    if (startTime) startTime.setHours(0, 0, 0, 0);
    if (endTime) endTime.setHours(23, 59, 59, 999);

    const sourceList = activeTab === "today" ? todayLeads : historyLeads;

    const filtered = sourceList.filter((item) => {
      if (!item.dateTime?.seconds) return false;

      const time = new Date(item.dateTime.seconds * 1000);

      if (startTime && time < startTime) return false;
      if (endTime && time > endTime) return false;

      return true;
    });

    setFilteredLeads(filtered);
  };

  const clearDateFilter = () => {
    setStartDate("");
    setEndDate("");
    setFilteredLeads(activeTab === "today" ? todayLeads : historyLeads);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setStartDate("");
    setEndDate("");
    setFilteredLeads(tab === "today" ? todayLeads : historyLeads);
  };

  const renderList = (list) =>
    list.length === 0 ? (
      <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-500">
        <p className="text-lg font-medium">No enquiries found</p>
        <p className="text-sm text-gray-400 mt-1">
          Try adjusting filters or selecting another tab
        </p>
      </div>
    ) : (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[350px]">
          <table className="min-w-full text-sm">
            <thead className="bg-purple-600 text-white sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left">Call</th>
                <th className="px-4 py-3 text-left">Lead Status</th>
                <th className="px-4 py-3 text-left">Number</th>
                <th className="px-4 py-3 text-left">Destination</th>
                <th className="px-4 py-3 text-left">Weight</th>
                <th className="px-4 py-3 text-left">Date</th>
              </tr>
            </thead>

            <tbody>
              {list.map((item) => {
                const number = item.WhatsApp_Number?.trim();
                const date = item.dateTime?.seconds
                  ? new Date(item.dateTime.seconds * 1000)
                  : null;

                return (
                  <tr
                    key={item.id}
                    className="border-t hover:bg-gray-50 transition"
                  >
                    <td className="px-4 py-2">
                      {number ? (
                        <a
                          href={`tel:${number}`}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm"
                        >
                          Call
                        </a>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>

                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <select
                          className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                          value={item.leadStatus || "Not Contacted"}
                          onChange={(e) =>
                            handleStatusChange(item.id, e.target.value)
                          }
                        >
                          <option value="Not Contacted">Not Contacted</option>
                          <option value="Once in a month">
                            Once in a month
                          </option>
                          <option value="B2B">B2B</option>
                          <option value="Hot Followup">Hot Followup</option>
                          <option value="Cold Followup">Cold Followup</option>
                          <option value="Appointment Fixed">
                            Appointment Fixed
                          </option>
                          <option value="Sales Closed">Sales Closed</option>
                        </select>

                        {savingId === item.id && (
                          <span className="text-xs text-purple-600 animate-pulse">
                            Saving...
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-2">{number || "—"}</td>
                    <td className="px-4 py-2">{item.Destination || "—"}</td>
                    <td className="px-4 py-2">{item.Weight || "—"}</td>

                    <td className="px-4 py-2 text-gray-500">
                      {date ? date.toLocaleString() : "No date"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );

  return (
    <>
      <div className="container mx-auto px-4 md:px-6 py-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Website Enquiries
          </h2>
          <p className="text-sm text-gray-500">
            Monitor and manage incoming customer leads
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <StatCard
            title="Today Leads"
            count={todayLeads.length}
            icon="📅"
            active={activeTab === "today"}
            color="purple"
          />
          <StatCard
            title="History Leads"
            count={historyLeads.length}
            icon="🕘"
            active={activeTab === "history"}
            color="gray"
          />
          <StatCard
            title="Filtered Results"
            count={filteredLeads.length}
            icon="🔎"
            color="green"
          />
        </div>

        {/* Tabs */}
        <div className="flex mb-4 bg-white rounded-xl shadow-sm p-1 w-fit">
          <TabButton
            active={activeTab === "today"}
            onClick={() => handleTabChange("today")}
            label="Today"
          />
          <TabButton
            active={activeTab === "history"}
            onClick={() => handleTabChange("history")}
            label="History"
          />
        </div>

        {/* Filters Accordion */}
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden ${
            activeTab === "history"
              ? "max-h-40 opacity-100 translate-y-0 mb-6"
              : "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
          }`}
        >
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Filters</p>

            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  const value = e.target.value;
                  setStartDate(value);
                  handleDateRangeSearch(value, endDate);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2"
              />

              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  const value = e.target.value;
                  setEndDate(value);
                  handleDateRangeSearch(startDate, value);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2"
              />

              {(startDate || endDate) && (
                <button
                  onClick={clearDateFilter}
                  className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg text-sm"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-500">
            Loading enquiries...
          </div>
        ) : (
          renderList(filteredLeads)
        )}

        {/* Toast */}
        {toast && (
          <div
            className={`fixed bottom-5 right-5 px-4 py-2 rounded-lg shadow-lg text-sm text-white ${
              toast.type === "success" ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </>
  );
}

/* Components */

const StatCard = ({ title, count, icon, active, color }) => {
  const colors = {
    purple: "border-purple-600 text-purple-700",
    gray: "border-gray-400 text-gray-700",
    green: "border-green-500 text-green-600",
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${
        colors[color]
      } ${active ? "ring-2 ring-purple-200" : ""}`}
    >
      <p className="text-[15px] text-gray-500">{title}</p>
      <p className="text-2xl font-bold">{count}</p>
    </div>
  );
};

const TabButton = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
      active
        ? "bg-purple-600 text-white shadow"
        : "text-gray-600 hover:bg-purple-50"
    }`}
  >
    {label}
  </button>
);
