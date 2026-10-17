
import { useEffect, useState } from "react";
import { AuthContext } from "./AuthContext.js";
import api from "../services/api";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(
    () => Boolean(localStorage.getItem("sahayak_token"))
  );

  useEffect(() => {
    const token = localStorage.getItem("sahayak_token");

    if (!token) {
      return;
    }

    let active = true;

    const initializeAuth = async () => {
      try {
        const response = await api.getMe();

        if (active) {
          setUser(response.data);
        }
      } catch {
        localStorage.removeItem("sahayak_token");

        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      active = false;
    };
  }, []);

  const login = async (credentials) => {
    const response = await api.login(credentials);

    localStorage.setItem(
      "sahayak_token",
      response.data.token
    );

    setUser(response.data.user);

    return response;
  };

  const register = async (userData) => {
    const response = await api.register(userData);

    localStorage.setItem(
      "sahayak_token",
      response.data.token
    );

    setUser(response.data.user);

    return response;
  };

  const logout = () => {
    localStorage.removeItem("sahayak_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
