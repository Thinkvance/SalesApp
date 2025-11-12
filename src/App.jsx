import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db, messaging } from "./firebase";
import {
  collection,
  getDocs,
  query,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { onMessage } from "firebase/messaging";
import { Toaster } from "react-hot-toast";
import utilityFunctions from "./Utility/utilityFunctions";

// Components
import PickupBooking from "./PickupBooking";
import RateCardForm from "./RateCard";
import PaymentConfirm from "./PaymentConfirm";
import PaymentConfirmationForm from "./PaymentConfirmationForm";
import SignIn from "./SignIn";
import CancelOrReshedule from "./CancelOrReshedule";
import Pickups from "./Pickups";
import LogisticsDashboard from "./LogisticsDashboard";
import AllPickups from "./AllPickups";
import PickupIncentive from "./PickupIncentive";
import VendorRates from "./VendorRates";
import ExtraChargesModule from "./ExtraChargesModule";
import PickupPersonIncentive from "./PickupPersonIncentive";
import SalesIncentive from "./SalesIncentive";
import SalesReport from "./SalesReport";
import Myshipments from "./Myshipments";
import Accounts from "./Accounts";
import ReviewManagement from "./ReviewManagement";
import VersionUpdateModal from "./VersionUpdateModal"; // Version modal
import appVersion from "./functions/appVersion";
import EscalationDashboard from "./EscalationDashboard"; // ✅ import
import ReportForm from "./ReportForm";

function PrivilegedOnly({ children }) {
  const stored = JSON.parse(localStorage.getItem("LoginCredentials") || "{}");
  const role = String(stored?.role || "").toLowerCase();
  // ✅ Allow Manager and Sales Admin
  const allowed = ["manager", "sales admin"];
  return allowed.includes(role) ? children : <Navigate to="/" replace />;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const CURRENT_APP_VERSION = appVersion.appversion;

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");

  console.log("Build: 12-11-2025 !!!!!!!!!");

  // ✅ Notifications
  useEffect(() => {
    const getPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;
        utilityFunctions.SuccessNotify("Notification permission granted");
      } catch (error) {
        console.error("Notification permission error:", error);
      }
    };

    getPermission();

    onMessage(messaging, (payload) => {
      utilityFunctions.foregroundNotification(payload.notification.body);
    });
  }, []);

  // ✅ Firebase Auth + user data
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const q = query(collection(db, "LoginCredentials"));
        const querySnapshot = await getDocs(q);
        let foundUser = false;

        for (const docSnap of querySnapshot.docs) {
          const result = docSnap.data();
          if (result[user.email]) {
            const dataset = {
              name: result[user.email][0],
              email: result[user.email][1],
              role: result[user.email][2],
              Location: result[user.email][3],
            };
            localStorage.setItem("LoginCredentials", JSON.stringify(dataset));
            foundUser = true;
          }
        }

        if (!foundUser) {
          console.warn("User not found in LoginCredentials:", user.email);
          utilityFunctions.ErrorNotify("User config not found in database.");
        }

        setUser(user);
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ✅ Realtime Version Check from Firestore
  useEffect(() => {
    const versionDocRef = doc(db, "config", "version");

    const unsubscribe = onSnapshot(versionDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        const version = data?.version;
        const forceUpdate = data?.forceUpdate;
        const message = data?.message;

        if (
          typeof version === "string" &&
          typeof forceUpdate === "boolean" &&
          version !== CURRENT_APP_VERSION &&
          forceUpdate
        ) {
          setUpdateMessage(message || "A new version is available.");
          setShowUpdateModal(true);
        }
      } else {
        console.warn("Version document not found in Firestore.");
      }
    });

    return () => unsubscribe();
  }, []);

  // Optional: Timeout fallback
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!showUpdateModal) {
        console.log("Skipping version check fallback (5s).");
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [showUpdateModal]);

  if (loading) return <div>Loading...</div>;

  // ✅ Refresh handler for updates
  const handleRefresh = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
        window.location.href = `${window.location.origin}?v=${Date.now()}`;
      });
    } else {
      window.location.href = `${window.location.origin}?v=${Date.now()}`;
    }
  };

  return (
    <>
      {showUpdateModal && (
        <VersionUpdateModal message={updateMessage} onRefresh={handleRefresh} />
      )}

      <Router>
        <div>
          <Toaster />
          <Routes>
            <Route
              path="/"
              element={user ? <PickupBooking /> : <Navigate to="/signin" />}
            />
            <Route
              path="/Pickup-Booking"
              element={user ? <PickupBooking /> : <Navigate to="/signin" />}
            />
            <Route
              path="/Sales-Report"
              element={user ? <SalesReport /> : <Navigate to="/signin" />}
            />
            <Route
              path="/accounts"
              element={user ? <Accounts /> : <Navigate to="/signin" />}
            />
            <Route
              path="/Cancel-or-reschedule"
              element={user ? <CancelOrReshedule /> : <Navigate to="/signin" />}
            />
            <Route
              path="/addExtraCharges"
              element={
                user ? <ExtraChargesModule /> : <Navigate to="/signin" />
              }
            />
            <Route
              path="/Pickups"
              element={user ? <Pickups /> : <Navigate to="/signin" />}
            />
            <Route
              path="/all-Pickups"
              element={user ? <AllPickups /> : <Navigate to="/signin" />}
            />
            <Route
              path="/Sale-rates"
              element={user ? <RateCardForm /> : <Navigate to="/signin" />}
            />
            <Route
              path="/vendor-rates"
              element={user ? <VendorRates /> : <Navigate to="/signin" />}
            />
            <Route
              path="/Payment-confirm"
              element={user ? <PaymentConfirm /> : <Navigate to="/signin" />}
            />
            <Route
              path="/logistics-Dashboard"
              element={
                user ? <LogisticsDashboard /> : <Navigate to="/signin" />
              }
            />
            <Route
              path="/Payment-confirmation-form/:awbnumber"
              element={
                user ? <PaymentConfirmationForm /> : <Navigate to="/signin" />
              }
            />
            <Route
              path="/Sales-Incentive"
              element={user ? <SalesIncentive /> : <Navigate to="/signin" />}
            />
            <Route
              path="/Pickup-Incentive"
              element={user ? <PickupIncentive /> : <Navigate to="/signin" />}
            />
            <Route
              path="/My-Shipments"
              element={user ? <Myshipments /> : <Navigate to="/signin" />}
            />
            {/* Report form public route */}
            <Route path="/ReportForm" element={<ReportForm />} />
            <Route
              path="/review-management"
              element={user ? <ReviewManagement /> : <Navigate to="/signin" />}
            />
            <Route
              path="/PickuPersonIncentive-Report"
              element={
                user ? <PickupPersonIncentive /> : <Navigate to="/signin" />
              }
            />
            <Route
              path="/signin"
              element={!user ? <SignIn /> : <Navigate to="/Pickup-Booking" />}
            />

            {/* ✅ Escalation Dashboard for Manager and Sales Admin */}
            <Route
              path="/escalations"
              element={
                <PrivilegedOnly>
                  <EscalationDashboard />
                </PrivilegedOnly>
              }
            />

            {/* 404 fallback */}
            <Route
              path="*"
              element={
                user ? (
                  <Navigate to="/" replace />
                ) : (
                  <Navigate to="/signin" replace />
                )
              }
            />
          </Routes>
        </div>
      </Router>
    </>
  );
}

export default App;
