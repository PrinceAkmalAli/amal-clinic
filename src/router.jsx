import { createBrowserRouter, Navigate } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import ClinicLayout from "./layouts/ClinicLayout";
import PlatformLayout from "./layouts/PlatformLayout";

import LoginPage from "./pages/auth/LoginPage";
import ClinicsPage from "./pages/platform/ClinicsPage";
import DashboardPage from "./pages/clinic/DashboardPage";
import FrontDeskPage from "./pages/clinic/FrontDeskPage";
import EmrPage from "./pages/clinic/EmrPage";
import IpdPage from "./pages/clinic/IpdPage";
import LabPage from "./pages/clinic/LabPage";
import FinancePage from "./pages/clinic/FinancePage";
import HrmPage from "./pages/clinic/HrmPage";
import ReportsPage from "./pages/clinic/ReportsPage";
import UsersPage from "./pages/clinic/UsersPage";
import SettingsPage from "./pages/clinic/SettingsPage";
import ComingSoonPage from "./pages/clinic/ComingSoonPage";
import DoctorDeskPage from "./pages/clinic/DoctorDeskPage";

// Page ko permission ke sath lapetne ka chota helper
const guard = (permission, element) => (
  <ProtectedRoute permission={permission}>{element}</ProtectedRoute>
);

/*
  /platform/login, /platform/clinics   -> aap (SaaS owner)
  /:clinicSlug/login                   -> us clinic ka login
  /:clinicSlug/...                     -> us clinic ka portal
*/
const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/platform/login" replace /> },

  { path: "/platform/login", element: <LoginPage mode="platform" /> },
  {
    path: "/platform",
    element: (
      <ProtectedRoute mode="platform">
        <PlatformLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="clinics" replace /> },
      { path: "clinics", element: <ClinicsPage /> },
    ],
  },

  { path: "/:clinicSlug/login", element: <LoginPage mode="clinic" /> },
  {
    path: "/:clinicSlug",
    element: (
      <ProtectedRoute mode="clinic">
        <ClinicLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "patients", element: guard(["reception.view", "patients.view"], <FrontDeskPage />) },
      { path: "doctor", element: guard("doctor.desk", <DoctorDeskPage />) },
      { path: "emr", element: guard("emr.view", <EmrPage />) },
      { path: "ipd", element: guard("ipd.view", <IpdPage />) },
      { path: "lab", element: guard("lab.view", <LabPage />) },
      { path: "finance", element: guard(["finance.self", "finance.view", "finance.manage", "finance.expenses", "finance.closing"], <FinancePage />) },
      { path: "hrm", element: guard("hrm.view", <HrmPage />) },
      { path: "reports", element: guard("reports.view", <ReportsPage />) },
      { path: "users", element: guard("users.manage", <UsersPage />) },
      { path: "settings", element: guard("settings.manage", <SettingsPage />) },
      { path: ":module", element: <ComingSoonPage /> },
    ],
  },
]);

export default router;
