import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Admin.css";

const AdminLogin = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const apiUrl = import.meta.env.VITE_API_URL;

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            if (!apiUrl) {
                throw new Error(
                    "VITE_API_URL is not configured in the frontend .env file."
                );
            }

            const response = await fetch(`${apiUrl}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            });

            const contentType = response.headers.get("content-type") || "";

            let data = null;

            if (contentType.includes("application/json")) {
                data = await response.json();
            } else {
                const text = await response.text();

                throw new Error(
                    text || `Server returned HTTP ${response.status}`
                );
            }

            if (!response.ok) {
                throw new Error(
                    data?.message || `Login failed (${response.status})`
                );
            }

            const loggedInUser = data?.data?.user;
            const token = data?.data?.token;

            if (!loggedInUser || !token) {
                throw new Error(
                    "Login succeeded but the server did not return valid authentication data."
                );
            }

            const userRole = String(loggedInUser.role || "").toUpperCase();

            if (userRole !== "ADMIN") {
                throw new Error(
                    `Access denied. Server returned role: ${loggedInUser.role || "unknown"
                    }`
                );
            }

            localStorage.setItem("sahayak_token", token);

            localStorage.setItem(
                "sahayak_user",
                JSON.stringify(loggedInUser)
            );

            navigate("/admin/dashboard");
        } catch (error) {
            console.error("Admin login error:", error);

            setError(
                error.message ||
                "Unable to connect to the Sahayak backend."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-login-page">
            <div className="admin-login-card">

                <div className="admin-login-header">
                    <div className="admin-logo">
                        🚑
                    </div>

                    <h1>Sahayak Admin</h1>

                    <p>Administrator Login</p>
                </div>

                {error && (
                    <div className="admin-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>

                    <div className="admin-form-group">
                        <label htmlFor="email">
                            Email
                        </label>

                        <input
                            id="email"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="admin@sahayak.local"
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div className="admin-form-group">
                        <label htmlFor="password">
                            Password
                        </label>

                        <input
                            id="password"
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter admin password"
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="admin-login-button"
                    >
                        {loading ? "Signing in..." : "Admin Login"}
                    </button>

                </form>

            </div>
        </div>
    );
};

export default AdminLogin;