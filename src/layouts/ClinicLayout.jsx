import { Outlet, useParams } from "react-router-dom";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import RecentTabs from "./RecentTabs";

export default function ClinicLayout() {
  const { clinicSlug } = useParams();
  const base = `/${clinicSlug}`;

  return (
    <>
      <Topbar title={clinicSlug.replace(/-/g, " ").toUpperCase()} loginPath={`${base}/login`} base={base} />
      <Sidebar base={base} />
      <main className="main">
        <div className="page">
          <RecentTabs base={base} />
          <Outlet />
        </div>
      </main>
    </>
  );
}
