import { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "../apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authStatus, setAuthStatus] = useState("loading");
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => sessionStorage.getItem("authToken"));

  useEffect(() => {
    const savedUser = sessionStorage.getItem("authUser");
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setAuthStatus("authed");
    } else {
      setAuthStatus("guest");
    }
  }, [token]);

  function saveAuth(token, user) {
    setToken(token);
    setUser(user);
    sessionStorage.setItem("authToken", token);
    sessionStorage.setItem("authUser", JSON.stringify(user));
    setAuthStatus("authed");
  }

  function logout() {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("authUser");
    setAuthStatus("guest");
  }

  async function login(identifier, password) {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });
    if (!data.success || !data.token || !data.user) {
      throw new Error("Login invalid");
    }
    saveAuth(data.token, data.user);
  }

  async function register({ username, email, password, tip }) {
    const data = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password, tip }),
    });

    if (!data.success || !data.token || !data.user) {
      throw new Error("Register invalid");
    }

    saveAuth(data.token, data.user);
  }

  const value = {
    authStatus,
    user,
    token,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
