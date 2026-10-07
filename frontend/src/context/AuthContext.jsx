import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("sahayak_token");

        if (!token) {
            setLoading(false);
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

export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth must be used inside AuthProvider"
        );
    }

    return context;
};