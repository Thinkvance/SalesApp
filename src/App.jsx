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

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const CURRENT_APP_VERSION = appVersion.appversion; // ✅ Update this on each deploy

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");

  console.log("Build: 24-09-2025 !!!!!!!!!");

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

        for (const doc of querySnapshot.docs) {
          const result = doc.data();
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

        // 🔐 Safe field checks
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

  // Optional: Timeout fallback if Firestore doesn't respond
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!showUpdateModal) {
        console.log("Skipping version check fallback (5s).");
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);

  if (loading) return <div>Loading...</div>;

  // ✅ Refresh with cache busting
  const handleRefresh = () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
        // Full reload with query param bust
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
          </Routes>
        </div>
      </Router>
    </>
  );
}

export default App;
