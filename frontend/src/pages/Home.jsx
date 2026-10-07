import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Home = () => {
    const { user } = useAuth();

    return (
        <main>
            <section className="hero">
                <div className="hero-content">
                    <span className="hero-badge">
                        🚨 Emergency Resource Coordination
                    </span>

                    <h1>
                        Find critical resources
                        <span> when every second matters.</span>
                    </h1>

                    <p>
                        Sahayak helps people discover available
                        emergency resources such as blood,
                        hospital beds, medicines, ambulances,
                        shelters, food and water.
                    </p>

                    <div className="hero-actions">
                        <Link
                            to="/resources"
                            className="btn btn-primary btn-large"
                        >
                            Find Resources
                        </Link>

                        {!user && (
                            <Link
                                to="/register"
                                className="btn btn-secondary btn-large"
                            >
                                Become a Provider
                            </Link>
                        )}
                    </div>
                </div>
            </section>

            <section className="features container">
                <div className="section-heading">
                    <span>HOW IT WORKS</span>
                    <h2>Emergency help, simplified.</h2>
                </div>

                <div className="feature-grid">
                    <div className="feature-card">
                        <div className="feature-icon">🔎</div>
                        <h3>Find</h3>
                        <p>
                            Search available emergency resources
                            by category and city.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">📍</div>
                        <h3>Connect</h3>
                        <p>
                            View verified providers and their
                            latest availability.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">🚨</div>
                        <h3>Request</h3>
                        <p>
                            Submit an emergency request and
                            track its status.
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
};

export default Home;