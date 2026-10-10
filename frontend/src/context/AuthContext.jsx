import { useEffect, useState } from "react";

import api from "../services/api";
import { AuthContext } from "./auth-context";

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

        api.getMe()
            .then((response) => {
                setUser(response.data);
            })
            .catch(() => {
                localStorage.removeItem("sahayak_token");
                setUser(null);
            })
            .finally(() => {
                setLoading(false);
            });
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
                isAuthenticated: Boolean(user)
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
