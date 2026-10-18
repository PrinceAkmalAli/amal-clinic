import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { NAV_GROUPS } from "../config/navigation";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ base }) {
  const { can } = useAuth();
  const { pathname, search } = useLocation();
  const tab = new URLSearchParams(search).get("tab");

  const renderItem = (item) => {
    const to = item.path ? `${base}/${item.path}` : base;
    const inside = pathname.replace(/\/$/, "") === to; // is page par hain?
    const kids = (item.children || []).filter((c) => can(c.permission));
    const activeIdx = kids.findIndex(
      (c) => tab === c.tab || (!tab && c.isDefault),
    );

    return (
      <div key={item.label}>
        <Link
          to={to}
          className={`nav-link ${inside && kids.length === 0 ? "active" : ""} ${inside ? "open" : ""}`}
        >
          <item.icon size={16} />
          {item.label}
        </Link>

        {/* Sub-menu sirf us waqt khulta hai jab parent page khula ho */}
        {inside && kids.length > 0 && (
          <div className="nav-children">
            {kids.map((c, i) => (
              <Link
                key={c.tab}
                to={`${to}?tab=${c.tab}`}
                className={`nav-sub ${i <= activeIdx ? "line" : ""} ${i === activeIdx ? "active" : ""}`}
              >
                {c.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="sidebar">
      {NAV_GROUPS.map((group, gi) => {
        const items = group.items.filter((i) => can(i.permission));
        if (items.length === 0) return null;
        return (
          <div key={gi}>
            {group.title && (
              <div className="nav-title">
                {group.title} <ChevronRight size={12} />
              </div>
            )}
            {items.map(renderItem)}
          </div>
        );
      })}
    </nav>
  );
}
