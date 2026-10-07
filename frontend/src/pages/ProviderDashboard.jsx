import { useEffect, useState } from "react";
import api from "../services/api";
import Loading from "../components/Loading";

const categories = [
    "BLOOD",
    "HOSPITAL_BED",
    "MEDICINE",
    "AMBULANCE",
    "SHELTER",
    "FOOD",
    "WATER"
];

const ProviderDashboard = () => {
    const [provider, setProvider] = useState(null);
    const [resources, setResources] = useState([]);
    const [requests, setRequests] = useState([]);

    const [providerForm, setProviderForm] = useState({
        organization: "",
        type: "",
        city: "",
        address: "",
        phone: ""
    });

    const [resourceForm, setResourceForm] = useState({
        name: "",
        category: "BLOOD",
        quantity: 0,
        available: true,
        city: "",
        address: "",
        description: ""
    });

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadDashboard = async () => {
        try {
            const [providerResponse, requestResponse] =
                await Promise.all([
                    api.getProviders(),
                    api.getProviderRequests()
                ]);

            const providers = providerResponse.data?.providers ?? [];

            const currentProvider = providers.find(
                (item) => Number(item.userId) === Number(user.id)
            );

            setProvider(currentProvider || null);

            if (currentProvider) {
                setResources(
                    currentProvider.resources || []
                );
            }

            setRequests(requestResponse.data);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    const handleProviderChange = (event) => {
        setProviderForm({
            ...providerForm,
            [event.target.name]: event.target.value
        });
    };

    const handleResourceChange = (event) => {
        const { name, value, type, checked } =
            event.target;

        setResourceForm({
            ...resourceForm,
            [name]:
                type === "checkbox"
                    ? checked
                    : value
        });
    };

    const createProvider = async (event) => {
        event.preventDefault();

        setSubmitting(true);
        setError("");
        setSuccess("");

        try {
            await api.createProvider(providerForm);

            setSuccess(
                "Provider profile created. It requires verification before resources can be published."
            );

            await loadDashboard();
        } catch (error) {
            setError(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const createResource = async (event) => {
        event.preventDefault();

        setSubmitting(true);
        setError("");
        setSuccess("");

        try {
            await api.createResource({
                ...resourceForm,
                quantity: Number(resourceForm.quantity)
            });

            setSuccess("Resource added successfully.");

            setResourceForm({
                ...resourceForm,
                name: "",
                quantity: 0,
                description: ""
            });

            await loadDashboard();
        } catch (error) {
            setError(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const updateAvailability = async (
        resource
    ) => {
        try {
            await api.updateResource(resource.id, {
                quantity: resource.quantity,
                available: !resource.available
            });

            await loadDashboard();
        } catch (error) {
            setError(error.message);
        }
    };

    const updateRequest = async (
        requestId,
        status
    ) => {
        try {
            await api.updateRequestStatus(
                requestId,
                status
            );

            await loadDashboard();
        } catch (error) {
            setError(error.message);
        }
    };

    if (loading) {
        return (
            <main className="container page">
                <Loading text="Loading provider dashboard..." />
            </main>
        );
    }

    return (
        <main className="container page">
            <div className="page-header">
                <span className="eyebrow">
                    PROVIDER PORTAL
                </span>

                <h1>Provider Dashboard</h1>

                <p>
                    Manage emergency resources and incoming
                    requests.
                </p>
            </div>

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

            {!provider ? (
                <section className="dashboard-section">
                    <div className="section-heading">
                        <span>STEP 1</span>
                        <h2>Create provider profile</h2>
                    </div>

                    <form
                        className="form-grid"
                        onSubmit={createProvider}
                    >
                        <label>
                            Organization
                            <input
                                name="organization"
                                value={
                                    providerForm.organization
                                }
                                onChange={handleProviderChange}
                                required
                                placeholder="City Hospital"
                            />
                        </label>

                        <label>
                            Provider Type
                            <input
                                name="type"
                                value={providerForm.type}
                                onChange={handleProviderChange}
                                required
                                placeholder="Hospital / NGO / Blood Bank"
                            />
                        </label>

                        <label>
                            City
                            <input
                                name="city"
                                value={providerForm.city}
                                onChange={handleProviderChange}
                                required
                                placeholder="Pune"
                            />
                        </label>

                        <label>
                            Phone
                            <input
                                name="phone"
                                value={providerForm.phone}
                                onChange={handleProviderChange}
                                placeholder="+91..."
                            />
                        </label>

                        <label className="full-width">
                            Address
                            <input
                                name="address"
                                value={providerForm.address}
                                onChange={handleProviderChange}
                                placeholder="Full address"
                            />
                        </label>

                        <button
                            className="btn btn-primary"
                            disabled={submitting}
                        >
                            Create Provider Profile
                        </button>
                    </form>
                </section>
            ) : (
                <>
                    <section className="provider-summary">
                        <div>
                            <span>Organization</span>
                            <strong>
                                {provider.organization}
                            </strong>
                        </div>

                        <div>
                            <span>City</span>
                            <strong>{provider.city}</strong>
                        </div>

                        <div>
                            <span>Verification</span>
                            <strong>
                                {provider.verified
                                    ? "✓ Verified"
                                    : "⏳ Pending"}
                            </strong>
                        </div>

                        <div>
                            <span>Resources</span>
                            <strong>
                                {resources.length}
                            </strong>
                        </div>
                    </section>

                    {!provider.verified && (
                        <div className="alert warning">
                            Your provider account is awaiting
                            verification. Resource creation will
                            become available after verification.
                        </div>
                    )}

                    {provider.verified && (
                        <section className="dashboard-section">
                            <div className="section-heading">
                                <span>STEP 2</span>
                                <h2>Add emergency resource</h2>
                            </div>

                            <form
                                className="form-grid"
                                onSubmit={createResource}
                            >
                                <label>
                                    Resource Name
                                    <input
                                        name="name"
                                        value={resourceForm.name}
                                        onChange={handleResourceChange}
                                        required
                                        placeholder="O+ Blood"
                                    />
                                </label>

                                <label>
                                    Category
                                    <select
                                        name="category"
                                        value={
                                            resourceForm.category
                                        }
                                        onChange={handleResourceChange}
                                    >
                                        {categories.map(
                                            (category) => (
                                                <option
                                                    key={category}
                                                    value={category}
                                                >
                                                    {category.replaceAll(
                                                        "_",
                                                        " "
                                                    )}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </label>

                                <label>
                                    Quantity
                                    <input
                                        type="number"
                                        min="0"
                                        name="quantity"
                                        value={
                                            resourceForm.quantity
                                        }
                                        onChange={handleResourceChange}
                                    />
                                </label>

                                <label>
                                    City
                                    <input
                                        name="city"
                                        value={resourceForm.city}
                                        onChange={handleResourceChange}
                                        required
                                    />
                                </label>

                                <label className="full-width">
                                    Address
                                    <input
                                        name="address"
                                        value={
                                            resourceForm.address
                                        }
                                        onChange={handleResourceChange}
                                    />
                                </label>

                                <label className="full-width">
                                    Description
                                    <textarea
                                        name="description"
                                        value={
                                            resourceForm.description
                                        }
                                        onChange={handleResourceChange}
                                        rows="3"
                                    />
                                </label>

                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="available"
                                        checked={
                                            resourceForm.available
                                        }
                                        onChange={handleResourceChange}
                                    />
                                    Currently available
                                </label>

                                <button
                                    className="btn btn-primary"
                                    disabled={submitting}
                                >
                                    Add Resource
                                </button>
                            </form>
                        </section>
                    )}

                    <section className="dashboard-section">
                        <div className="section-heading">
                            <span>RESOURCES</span>
                            <h2>Manage availability</h2>
                        </div>

                        <div className="resource-grid">
                            {resources.map((resource) => (
                                <article
                                    className="resource-card"
                                    key={resource.id}
                                >
                                    <span className="category-badge">
                                        {resource.category.replaceAll(
                                            "_",
                                            " "
                                        )}
                                    </span>

                                    <h3>{resource.name}</h3>

                                    <p>
                                        Quantity:{" "}
                                        {resource.quantity}
                                    </p>

                                    <button
                                        className="btn btn-outline btn-full"
                                        onClick={() =>
                                            updateAvailability(
                                                resource
                                            )
                                        }
                                    >
                                        {resource.available
                                            ? "Mark Unavailable"
                                            : "Mark Available"}
                                    </button>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className="dashboard-section">
                        <div className="section-heading">
                            <span>EMERGENCY REQUESTS</span>
                            <h2>Incoming requests</h2>
                        </div>

                        {requests.length === 0 ? (
                            <div className="empty-state">
                                <div>📭</div>
                                <h3>No incoming requests</h3>
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
                                                {request.priority}
                                            </span>

                                            <h3>
                                                {request.resource.name}
                                            </h3>

                                            <p>
                                                Requested by:{" "}
                                                {request.user.name}
                                            </p>

                                            <p>
                                                Quantity:{" "}
                                                {request.quantity}
                                            </p>

                                            <p>
                                                Message:{" "}
                                                {request.message ||
                                                    "No message"}
                                            </p>
                                        </div>

                                        <div className="request-actions">
                                            <span
                                                className={`status status-${request.status.toLowerCase()}`}
                                            >
                                                {request.status}
                                            </span>

                                            {request.status ===
                                                "PENDING" && (
                                                    <>
                                                        <button
                                                            className="btn btn-primary"
                                                            onClick={() =>
                                                                updateRequest(
                                                                    request.id,
                                                                    "ACCEPTED"
                                                                )
                                                            }
                                                        >
                                                            Accept
                                                        </button>

                                                        <button
                                                            className="btn btn-danger"
                                                            onClick={() =>
                                                                updateRequest(
                                                                    request.id,
                                                                    "REJECTED"
                                                                )
                                                            }
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}
        </main>
    );
};

export default ProviderDashboard;