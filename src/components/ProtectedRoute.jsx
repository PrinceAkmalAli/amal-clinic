import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// mode="platform"  -> sirf platform admin
// mode="clinic"    -> sirf us clinic ka user (URL ke slug se match)
// permission="x"   -> user ke paas wo permission honi chahiye
export default function ProtectedRoute({ children, mode, permission }) {
  const { user, isLoggedIn, can } = useAuth();
  const { clinicSlug } = useParams();

  if (mode === "platform") {
    if (!isLoggedIn || user.role !== "platform_admin") return <Navigate to="/platform/login" replace />;
  }
  if (mode === "clinic") {
    if (!isLoggedIn || user.clinicSlug !== clinicSlug) return <Navigate to={`/${clinicSlug}/login`} replace />;
  }
  if (permission && !can(permission)) {
    return <div className="empty">Aap ke paas is page ka access nahi hai.</div>;
  }
  return children;
}
