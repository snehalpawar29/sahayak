import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const Login = () => {
    const { login } = useAuth();

    const navigate = useNavigate();
    const location = useLocation();

    const [form, setForm] = useState({
        email: "",
        password: ""
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (event) => {
        setForm({
            ...form,
            [event.target.name]: event.target.value
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            const response = await login(form);

            const role = response.data.user.role;

            const redirectPath =
                location.state?.from ||
                (role === "PROVIDER"
                    ? "/provider"
                    : "/resources");

            navigate(redirectPath);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="auth-page">
            <form
                className="auth-card"
                onSubmit={handleSubmit}
            >
                <div className="section-heading">
                    <span>WELCOME BACK</span>
                    <h1>Sign in to Sahayak</h1>
                </div>

                {error && (
                    <div className="alert error">
                        {error}
                    </div>
                )}

                <label>
                    Email
                    <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        placeholder="you@example.com"
                    />
                </label>

                <label>
                    Password
                    <input
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        required
                        placeholder="Minimum 8 characters"
                    />
                </label>

                <button
                    className="btn btn-primary btn-full"
                    disabled={loading}
                >
                    {loading ? "Signing in..." : "Sign In"}
                </button>

                <p className="auth-footer">
                    Don't have an account?{" "}
                    <Link to="/register">
                        Create one
                    </Link>
                </p>
            </form>
        </main>
    );
};

export default Login;