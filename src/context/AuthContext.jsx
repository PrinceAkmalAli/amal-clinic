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
  // can(["a", "b"]) -> in mein se koi bhi ho to true
  const can = (permission) => {
    if (!permission) return true;
    if (Array.isArray(permission)) return permission.some(can);
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
