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
import {
  AccountantRootRedirect,
  RequireAuth,
  RequireRole,
} from "./RouteGuards";
import UserManagement from "./UserManagement";
import ClientApprovals from "./ClientApprovals";
import ExecutiveClientsScreen from "./ExecutiveClientsScreen";
import ClientOnboarding from "./ClientOnboarding";
// import { fetchLowestRate } from "./Utility/fetchLowestRate";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const CURRENT_APP_VERSION = appVersion.appversion;

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");

  // ✅ Notifications
  useEffect(() => {
    const getPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;
        // utilityFunctions.SuccessNotify("Notification permission granted");
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

  // useEffect(() => {
  //   const testFetch = async () => {
  //     const result = await fetchRate("USA", "Express", "1 Kg FLAT");
  //     console.log("Rate:", result);
  //   };

  //   testFetch();
  // }, []);

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
              element={
                <RequireAuth user={user}>
                  <AccountantRootRedirect
                    role={
                      JSON.parse(localStorage.getItem("LoginCredentials"))?.role
                    }
                  >
                    <PickupBooking />
                  </AccountantRootRedirect>
                </RequireAuth>
              }
            />
            <Route
              path="/Pickup-Booking"
              element={
                <RequireAuth user={user}>
                  <PickupBooking />
                </RequireAuth>
              }
            />
            <Route
              path="/Client-Onboarding"
              element={
                <RequireAuth user={user}>
                  <ClientOnboarding />
                </RequireAuth>
              }
            />

            <Route
              path="/Client-Overview"
              element={
                <RequireAuth user={user}>
                  <ExecutiveClientsScreen />
                </RequireAuth>
              }
            />

            <Route
              path="/client-approvals"
              element={
                <RequireAuth user={user}>
                  <RequireRole
                    role={
                      JSON.parse(localStorage.getItem("LoginCredentials"))?.role
                    }
                    allowed={["Manager"]}
                  >
                    <ClientApprovals />
                  </RequireRole>
                </RequireAuth>
              }
            />

            <Route
              path="/User-Management"
              element={
                <RequireAuth user={user}>
                  <RequireRole
                    role={
                      JSON.parse(localStorage.getItem("LoginCredentials"))?.role
                    }
                    allowed={["Manager"]}
                  >
                    <UserManagement />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/Sales-Report"
              element={
                <RequireAuth user={user}>
                  <SalesReport />
                </RequireAuth>
              }
            />
            <Route
              path="/Vendor-Report"
              element={
                <RequireAuth user={user}>
                  <RequireRole
                    role={
                      JSON.parse(localStorage.getItem("LoginCredentials"))?.role
                    }
                    allowed={["Manager", "Accountant"]}
                  >
                    <Accounts />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/Cancel-or-reschedule"
              element={
                <RequireAuth user={user}>
                  <CancelOrReshedule />
                </RequireAuth>
              }
            />
            <Route
              path="/addExtraCharges"
              element={
                <RequireAuth user={user}>
                  <RequireRole
                    role={
                      JSON.parse(localStorage.getItem("LoginCredentials"))?.role
                    }
                    allowed={["Manager"]}
                  >
                    <ExtraChargesModule />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/Pickups"
              element={
                <RequireAuth user={user}>
                  <Pickups />
                </RequireAuth>
              }
            />
            <Route
              path="/all-Pickups"
              element={
                <RequireAuth user={user}>
                  <RequireRole
                    role={
                      JSON.parse(localStorage.getItem("LoginCredentials"))?.role
                    }
                    allowed={["Manager"]}
                  >
                    <AllPickups />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/Sale-rates"
              element={
                <RequireAuth user={user}>
                  <RateCardForm />
                </RequireAuth>
              }
            />
            <Route
              path="/vendor-rates"
              element={
                <RequireAuth user={user}>
                  <RequireRole
                    role={
                      JSON.parse(localStorage.getItem("LoginCredentials"))?.role
                    }
                    allowed={["Manager"]}
                  >
                    <VendorRates />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/Payment-confirm"
              element={
                <RequireAuth user={user}>
                  <PaymentConfirm />
                </RequireAuth>
              }
            />
            <Route
              path="/logistics-Dashboard"
              element={
                <RequireAuth user={user}>
                  <RequireRole
                    role={
                      JSON.parse(localStorage.getItem("LoginCredentials"))?.role
                    }
                    allowed={["Manager"]}
                  >
                    <LogisticsDashboard />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/Payment-confirmation-form/:awbnumber"
              element={
                <RequireAuth user={user}>
                  <PaymentConfirmationForm />
                </RequireAuth>
              }
            />
            <Route
              path="/Sales-Incentive"
              element={
                <RequireAuth user={user}>
                  <RequireRole
                    role={
                      JSON.parse(localStorage.getItem("LoginCredentials"))?.role
                    }
                    allowed={["Manager"]}
                  >
                    <SalesIncentive />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/Pickup-Incentive"
              element={
                <RequireAuth user={user}>
                  <RequireRole
                    role={
                      JSON.parse(localStorage.getItem("LoginCredentials"))?.role
                    }
                    allowed={["Manager"]}
                  >
                    <PickupIncentive />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/My-Shipments"
              element={
                <RequireAuth user={user}>
                  <Myshipments />
                </RequireAuth>
              }
            />
            {/* Report form public route */}
            <Route
              path="/ReportForm"
              element={
                <RequireAuth user={user}>
                  <ReportForm />
                </RequireAuth>
              }
            />
            <Route
              path="/review-management"
              element={
                <RequireAuth user={user}>
                  <RequireRole
                    role={
                      JSON.parse(localStorage.getItem("LoginCredentials"))?.role
                    }
                    allowed={["Manager"]}
                  >
                    <ReviewManagement />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/PickuPersonIncentive-Report"
              element={
                <RequireAuth user={user}>
                  <RequireRole
                    role={
                      JSON.parse(localStorage.getItem("LoginCredentials"))?.role
                    }
                    allowed={["Manager"]}
                  >
                    <PickupPersonIncentive />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/escalations"
              element={
                <RequireAuth user={user}>
                  <RequireRole
                    role={
                      JSON.parse(localStorage.getItem("LoginCredentials"))?.role
                    }
                    allowed={["Manager"]}
                  >
                    <EscalationDashboard />
                  </RequireRole>
                </RequireAuth>
              }
            />
            <Route
              path="/signin"
              element={
                loading ? (
                  <div>Loading</div>
                ) : user ? (
                  <Navigate to="/" replace />
                ) : (
                  <SignIn />
                )
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
