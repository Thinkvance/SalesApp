// RouteGuards.jsx
import { Navigate, useLocation } from "react-router-dom";

export function RequireAuth({ user, children, fallback = "/signin" }) {
  const location = useLocation();
  if (user === null) {
    return <Navigate to={fallback} state={{ from: location }} replace />;
  }
  return children;
}

export function RequireRole({ role, allowed, fallback = "/", children }) {
  if (!role) return <Navigate to={fallback} replace />;
  const allowedArr = Array.isArray(allowed) ? allowed : [allowed];
  const normalized = allowedArr.map((r) => String(r).toLowerCase());
  if (normalized.includes(String(role).toLowerCase())) {
    return children;
  }
  return <Navigate to={fallback} replace />;
}

// ✅ NEW GUARD
export function AccountantRootRedirect({ role, children }) {
  const location = useLocation();
  if (
    String(role).toLowerCase() === "accountant" &&
    location.pathname === "/"
  ) {
    return <Navigate to="/sales-report" replace />;
  }

  return children;
}
