import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => JSON.parse(localStorage.getItem("auth") || "null"));

  const saveLogin = (data) => {
    localStorage.setItem("auth", JSON.stringify(data));
    setAuth(data);
  };

  const logout = () => {
    localStorage.removeItem("auth");
    setAuth(null);
  };

  // can("patients.view") -> true/false
  const can = (permission) => {
    if (!permission) return true;
    const list = auth?.user?.permissions || [];
    return list.includes("*") || list.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user: auth?.user, isLoggedIn: !!auth, saveLogin, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
