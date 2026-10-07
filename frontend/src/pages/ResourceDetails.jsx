import { useEffect, useState } from "react";
import {
    Link,
    useNavigate,
    useParams
} from "react-router-dom";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Loading from "../components/Loading";

const ResourceDetails = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [resource, setResource] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [priority, setPriority] = useState("HIGH");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [requesting, setRequesting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        const loadResource = async () => {
            try {
                const response =
                    await api.getResource(id);

                setResource(response.data);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        loadResource();
    }, [id]);

    const handleRequest = async (event) => {
        event.preventDefault();

        if (!user) {
            navigate("/login", {
                state: {
                    from: `/resources/${id}`
                }
            });

            return;
        }

        setRequesting(true);
        setError("");
        setSuccess("");

        try {
            await api.createRequest({
                resourceId: Number(id),
                quantity: Number(quantity),
                priority,
                message
            });

            setSuccess(
                "Emergency request submitted successfully."
            );

            setQuantity(1);
            setMessage("");
        } catch (error) {
            setError(error.message);
        } finally {
            setRequesting(false);
        }
    };

    if (loading) {
        return (
            <main className="container page">
                <Loading />
            </main>
        );
    }

    if (!resource) {
        return (
            <main className="container page">
                <div className="alert error">
                    {error || "Resource not found"}
                </div>
            </main>
        );
    }

    return (
        <main className="container page">
            <Link
                to="/resources"
                className="back-link"
            >
                ← Back to resources
            </Link>

            <div className="details-layout">
                <section className="details-card">
                    <div className="resource-card-header">
                        <span className="category-badge">
                            {resource.category.replaceAll("_", " ")}
                        </span>

                        <span
                            className={
                                resource.available
                                    ? "status available"
                                    : "status unavailable"
                            }
                        >
                            {resource.available
                                ? "Available"
                                : "Unavailable"}
                        </span>
                    </div>

                    <h1>{resource.name}</h1>

                    <p className="large-text">
                        {resource.description ||
                            "Emergency resource provided by a registered provider."}
                    </p>

                    <div className="detail-list">
                        <div>
                            <span>Provider</span>
                            <strong>
                                {resource.provider.organization}
                            </strong>
                        </div>

                        <div>
                            <span>Type</span>
                            <strong>
                                {resource.provider.type}
                            </strong>
                        </div>

                        <div>
                            <span>Location</span>
                            <strong>
                                {resource.city}
                            </strong>
                        </div>

                        <div>
                            <span>Address</span>
                            <strong>
                                {resource.address ||
                                    resource.provider.address ||
                                    "Not provided"}
                            </strong>
                        </div>

                        <div>
                            <span>Available Quantity</span>
                            <strong>
                                {resource.quantity}
                            </strong>
                        </div>

                        <div>
                            <span>Last Updated</span>
                            <strong>
                                {new Date(
                                    resource.updatedAt
                                ).toLocaleString()}
                            </strong>
                        </div>
                    </div>
                </section>

                {user?.role === "CITIZEN" &&
                    resource.available && (
                        <form
                            className="request-card"
                            onSubmit={handleRequest}
                        >
                            <h2>Request this resource</h2>

                            <p>
                                Submit an emergency request to
                                the provider.
                            </p>

                            {error && (
                                <div className="alert error">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="alert success">
                                    {success}
                                </div>
                            )}

                            <label>
                                Quantity
                                <input
                                    type="number"
                                    min="1"
                                    max={resource.quantity}
                                    value={quantity}
                                    onChange={(event) =>
                                        setQuantity(event.target.value)
                                    }
                                    required
                                />
                            </label>

                            <label>
                                Priority
                                <select
                                    value={priority}
                                    onChange={(event) =>
                                        setPriority(event.target.value)
                                    }
                                >
                                    <option value="LOW">
                                        Low
                                    </option>

                                    <option value="MEDIUM">
                                        Medium
                                    </option>

                                    <option value="HIGH">
                                        High
                                    </option>

                                    <option value="CRITICAL">
                                        Critical
                                    </option>
                                </select>
                            </label>

                            <label>
                                Message
                                <textarea
                                    value={message}
                                    onChange={(event) =>
                                        setMessage(event.target.value)
                                    }
                                    placeholder="Describe your emergency..."
                                    rows="4"
                                />
                            </label>

                            <button
                                className="btn btn-primary btn-full"
                                disabled={requesting}
                            >
                                {requesting
                                    ? "Submitting..."
                                    : "🚨 Submit Emergency Request"}
                            </button>
                        </form>
                    )}

                {!user && (
                    <div className="request-card">
                        <h2>Need this resource?</h2>

                        <p>
                            Sign in to submit an emergency
                            request.
                        </p>

                        <Link
                            to="/login"
                            className="btn btn-primary btn-full"
                        >
                            Sign In
                        </Link>
                    </div>
                )}
            </div>
        </main>
    );
};

export default ResourceDetails;