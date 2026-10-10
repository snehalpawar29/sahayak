import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
    const location = useLocation();
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    if (location.pathname.startsWith("/admin")) {
        return null;
    }

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <header className="navbar">
            <div className="nav-container">
                <Link to="/" className="brand">
                    🚑 Sahayak
                </Link>

                <nav className="nav-links">
                    <Link to="/resources">
                        Find Resources
                    </Link>

                    {user?.role === "CITIZEN" && (
                        <Link to="/my-requests">
                            My Requests
                        </Link>
                    )}

                    {user?.role === "PROVIDER" && (
                        <Link to="/provider">
                            Provider Dashboard
                        </Link>
                    )}

                    {user ? (
                        <>
                            <span className="user-name">
                                {user.name}
                            </span>

                            <button
                                className="btn btn-outline"
                                onClick={handleLogout}
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login">
                                Login
                            </Link>

                            <Link
                                to="/register"
                                className="btn btn-primary"
                            >
                                Register
                            </Link>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
};

export default Navbar;