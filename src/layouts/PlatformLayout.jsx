import { NavLink, Outlet } from "react-router-dom";
import { Building2 } from "lucide-react";
import Topbar from "./Topbar";

export default function PlatformLayout() {
  return (
    <>
      <Topbar title="Clinic platform" loginPath="/platform/login" />
      <nav className="sidebar">
        <NavLink to="/platform/clinics" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
          <Building2 size={16} /> Clinics
        </NavLink>
      </nav>
      <main className="main">
        <div className="page"><Outlet /></div>
      </main>
    </>
  );
}
