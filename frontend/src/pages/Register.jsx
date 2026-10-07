import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Register = () => {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        city: "",
        role: "CITIZEN"
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
            const response = await register(form);

            if (response.data.user.role === "PROVIDER") {
                navigate("/provider");
            } else {
                navigate("/resources");
            }
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
                    <span>GET STARTED</span>
                    <h1>Create your account</h1>
                </div>

                {error && (
                    <div className="alert error">
                        {error}
                    </div>
                )}

                <label>
                    Full Name
                    <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        placeholder="Your name"
                    />
                </label>

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
                    City
                    <input
                        name="city"
                        value={form.city}
                        onChange={handleChange}
                        placeholder="Pune"
                    />
                </label>

                <label>
                    Account Type
                    <select
                        name="role"
                        value={form.role}
                        onChange={handleChange}
                    >
                        <option value="CITIZEN">
                            Citizen
                        </option>

                        <option value="PROVIDER">
                            Resource Provider
                        </option>
                    </select>
                </label>

                <label>
                    Password
                    <input
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        required
                        minLength={8}
                        placeholder="Minimum 8 characters"
                    />
                </label>

                <button
                    className="btn btn-primary btn-full"
                    disabled={loading}
                >
                    {loading
                        ? "Creating account..."
                        : "Create Account"}
                </button>

                <p className="auth-footer">
                    Already registered?{" "}
                    <Link to="/login">
                        Sign in
                    </Link>
                </p>
            </form>
        </main>
    );
};

export default Register;