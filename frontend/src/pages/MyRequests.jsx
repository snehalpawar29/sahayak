import { useEffect, useState } from "react";
import Loading from "../components/Loading";
import api from "../services/api";

const MyRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadRequests = async () => {
            try {
                const response =
                    await api.getMyRequests();

                setRequests(response.data);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        loadRequests();
    }, []);

    if (loading) {
        return (
            <main className="container page">
                <Loading text="Loading your requests..." />
            </main>
        );
    }

    return (
        <main className="container page">
            <div className="page-header">
                <span className="eyebrow">
                    EMERGENCY REQUESTS
                </span>

                <h1>My Requests</h1>

                <p>
                    Track the status of your emergency
                    resource requests.
                </p>
            </div>

            {error && (
                <div className="alert error">
                    {error}
                </div>
            )}

            {requests.length === 0 ? (
                <div className="empty-state">
                    <div>📋</div>
                    <h2>No requests yet</h2>
                    <p>
                        Your emergency requests will appear
                        here.
                    </p>
                </div>
            ) : (
                <div className="request-list">
                    {requests.map((request) => (
                        <article
                            className="request-item"
                            key={request.id}
                        >
                            <div>
                                <span className="category-badge">
                                    {request.resource.category.replaceAll(
                                        "_",
                                        " "
                                    )}
                                </span>

                                <h3>
                                    {request.resource.name}
                                </h3>

                                <p>
                                    Provider:{" "}
                                    {request.resource.provider.organization}
                                </p>

                                <p>
                                    Quantity:{" "}
                                    {request.quantity}
                                </p>

                                <p>
                                    Submitted:{" "}
                                    {new Date(
                                        request.createdAt
                                    ).toLocaleString()}
                                </p>
                            </div>

                            <div className="request-status">
                                <span
                                    className={`status status-${request.status.toLowerCase()}`}
                                >
                                    {request.status}
                                </span>

                                <span>
                                    Priority: {request.priority}
                                </span>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </main>
    );
};

export default MyRequests;