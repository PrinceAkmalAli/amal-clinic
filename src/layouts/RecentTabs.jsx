import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import { ALL_NAV } from "../config/navigation";

// Pichle khule pages yaad rakhta hai (max 6)
export default function RecentTabs({ base }) {
  const { pathname } = useLocation();
  const [tabs, setTabs] = useState([]);

  useEffect(() => {
    const path = pathname.replace(base, "").replace(/^\//, "");
    const item = ALL_NAV.find((n) => n.path === path);
    if (!item) return;
    setTabs((old) => [item, ...old.filter((t) => t.path !== item.path)].slice(0, 6));
  }, [pathname, base]);

  const close = (path) => setTabs((old) => old.filter((t) => t.path !== path));

  return (
    <div className="recent-tabs">
      {tabs.map((t) => {
        const to = `${base}/${t.path}`.replace(/\/$/, "") || base;
        const active = pathname.replace(/\/$/, "") === to;
        return (
          <div key={t.path} className={`tab ${active ? "active" : ""}`}>
            <Link to={to}>{t.label}</Link>
            <button onClick={() => close(t.path)}><X size={12} /></button>
          </div>
        );
      })}
    </div>
  );
}
