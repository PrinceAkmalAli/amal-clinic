import { Search, Bell, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Topbar({ title, loginPath, base }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate(loginPath);
  };

  return (
    <header className="topbar">
      <div className="brand">{title}</div>
      <div className="search">
        <Search size={14} />
        <input placeholder="Search patient by name, MR number..." onKeyDown={(e) => { if (e.key === "Enter" && base) navigate(`${base}/patients?q=${encodeURIComponent(e.target.value)}`); }} />
      </div>
      <div className="user">
        <button className="icon-btn"><Bell size={16} /></button>
        <div className="avatar">{user?.name?.slice(0, 2).toUpperCase()}</div>
        <span>{user?.name}</span>
        <button className="icon-btn" onClick={handleLogout} title="Log out"><LogOut size={16} /></button>
      </div>
    </header>
  );
}
